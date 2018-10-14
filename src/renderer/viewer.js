var $ = require('jquery');
var pdfjs = require('pdfjs-dist/webpack.js');
var dialog = require('./dialog.js');
var pagination = require('./pagination.js');

// Declare global variables
var $domLoader = $('.dom-loader');
var $topbar = $('body > .topbar');
var $navigation = $('.page[data-page="viewer"] .navigation');
var $preview = $('.page[data-page="viewer"] .preview');
var totalJobs, finishedJobs;

// Attach event listeners
$navigation.on('click', '.thumbnail', function() {
  var $page = $preview.find('[data-page=' + $(this).data('page') + ']');
  $preview.stop().animate({
    scrollTop: $page.get(0).offsetTop - 20
  }, 200);
});
$preview.on('scroll', function(e) {
  for (var i=0; i<e.target.children.length; i++) {
    var page = e.target.children[i];
    if (e.target.scrollTop < (page.offsetTop+page.offsetHeight/2)) {
      $navigation.find('.selected').removeClass('selected');
      var $thumb = $navigation.find('[data-page="' + (i+1) + '"]');
      $thumb.addClass('selected');
      $navigation.stop().animate({
        scrollTop: $thumb.get(0).offsetTop - 10
      }, 100);
      break;
    }
  }
});
$(window).resize(resizePreviewPages);


/******************************************************************************
 *** LOADING FUNCTIONS ********************************************************
 ******************************************************************************/


/**
 * Load document
 * @param {string|File} doc Path to PDF file or `File` instance
 */
function loadDocument(doc) {
  // Prepare document to load
  if (doc.name) {
    var fileReader = new FileReader();
    fileReader.onload = function() {
      var data = new Uint8Array(this.result);
      loadDocument(data);
    };
    fileReader.readAsArrayBuffer(doc);
    return;
  }

  // Read PDF file
  pagination.showPage('loading');
  pdfjs.getDocument(doc).then(function(pdf) {
    prepareDom(pdf.numPages);
    var pagePromises = [];
    for (var page=1; page<=pdf.numPages; page++) {
      pagePromises.push(loadPage(pdf, page));
    }
    return Promise.all(pagePromises);
  }).then(function() {
    updateTotalFlagCounter();
    pagination.showPage('viewer');
    $navigation.scrollTop(0);
    $preview.scrollTop(0);
    var interval = setInterval(function() {
      if (resizePreviewPages()) clearInterval(interval);
    }, 80);
  }).catch(function() {
    dialog.show('Failed to load file',
      '<p>Selected file is not a valid PDF document or is corrupted.</p>' +
      '<p>Please make sure this app has <strong>read access</strong> to the ' +
      'file and that it can be opened using a PDF reader.</p>');
    pagination.showPage('welcome');
  });
}


/**
 * Set progress
 * @param {float} n Progress status (in percent)
 */
function setProgress(n, isIncrement) {
  var $progress = $('.page[data-page="loading"] .progress div');
  $progress.css('width', n + '%');
}


/**
 * Notify current job is finished
 */
function notifyJobFinished() {
  finishedJobs++;
  setProgress((finishedJobs / totalJobs) * 100);
}


/**
 * Prepare DOM to contain a new document
 * @param {int} pages Number of pages
 */
function prepareDom(pages) {
  var navHtml = '', previewHtml = '';
  for (var i=1; i<=pages; i++) {
    navHtml += '<a class="thumbnail" data-page="' + i + '"><canvas /></a>';
    previewHtml += '<div class="page" data-page="' + i + '" />';
  }
  $navigation.html(navHtml);
  $navigation.find('[data-page=1]').addClass('selected');
  $preview.html(previewHtml);
  $topbar.find('.item-issues').hide();

  // Reset progress
  totalJobs = pages * 3;
  finishedJobs = 0;
  setProgress(0);
}


/**
 * Load document page
 * @param  {object}  pdf     PDF document
 * @param  {int}     pageNum Page number
 * @return {Promise}         Callback
 */
function loadPage(pdf, pageNum) {
  return new Promise(function(resolve) {
    return pdf.getPage(pageNum).then(function(page) {
      return Promise.all([
        renderThumbnail(page).then(notifyJobFinished),
        renderPreview(page).then(notifyJobFinished),
        analyzePage(page).then(notifyJobFinished)
      ]);
    }).then(resolve);
  });
}


/**
 * Render page thumbnail
 * @param  {object}  page Page object
 * @return {Promise}      Callback
 */
function renderThumbnail(page) {
  var pageNum = page.pageIndex + 1;
  var viewport = page.getViewport(0.3);
  var canvas = $navigation.find('[data-page="' + pageNum + '"] canvas').get(0);
  var context = canvas.getContext('2d', {alpha: false});
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  return page.render({canvasContext: context, viewport: viewport});
}


/**
 * Render page preview
 * @param  {object}  page Page object
 * @return {Promise}      Callback
 */
function renderPreview(page) {
  var viewport = page.getViewport(1);
  var $container = $preview.find('[data-page="' + (page.pageIndex+1) + '"]');

  // Set container dimensions
  $container.css({
    width: viewport.width + 'px',
    height: viewport.height + 'px'
  }).data('proportion', viewport.width / viewport.height)
  .data('maxWidth', viewport.width);

  // Render canvas
  var canvas = $('<canvas />').appendTo($container).get(0);
  var context = canvas.getContext('2d', {alpha: false});
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  return page.render({canvasContext: context, viewport: viewport});
}


/******************************************************************************
 *** PAGE ANALYSIS FUNCTIONS **************************************************
 ******************************************************************************/


/**
 * Analyze page
 * @param  {object}  page Page object
 * @return {Promise}      Callback
 */
function analyzePage(page) {
  return new Promise(function(resolve) {
    var viewport = page.getViewport(1);
    page.getOperatorList().then(function(opList) {
      var svgRenderer = new pdfjs.SVGGraphics(page.commonObjs, page.objs);
      return svgRenderer.getSVG(opList, viewport);
    }).then(function(svg) {
      svg.setAttribute('data-page', page.pageIndex+1);
      $domLoader.append(svg);
      setTimeout(function() {
        // Analyze TSPAN elements from SVG renderer
        var flaggedNodes = [];
        $(svg).find('*').each(function() {
          if (this.localName !== 'tspan') return true;
          analyzeTspan(this, flaggedNodes);
        }).parent().remove();

        // Analyze annotations and resolve
        analyzeAnnotations(page).then(function() {
          updateFlagCounter(page.pageIndex+1);
          resolve();
        });
      }, 500);
    });
  });
}


/**
 * Analyze `tspan` element
 * @param {object} elem         TSPAN element
 * @param {array}  flaggedNodes Already flagged nodes
 */
function analyzeTspan(elem, flaggedNodes) {
  // Check color brightness
  if (getColorBrightness(elem.getAttribute('fill')) > 200) {
    console.log(elem.parentNode);
    flagElement(elem, 'Text is too bright to be read', flaggedNodes);
  }

  // Check font size
  var fontSize = elem.getAttribute('font-size');
  var textLength = elem.innerHTML.replace(/[^a-zA-Z0-9]/g, '').length;
  if ((fontSize !== null) && (fontSize.replace('px', '') <= 4) && (textLength > 100)) {
    flagElement(elem, 'Text is too small to be read', flaggedNodes);
  }

  // Detect homograph attacks
  for (var i=0; i<elem.innerHTML.length; i++) {
    var code = elem.innerHTML.charCodeAt(i);
    if (code <= 0x03ff) continue;
    if (code >= 0x2000 && code <= 0x2bff) continue; // Punct. signs and others
    if (code >= 0xe000 && code <= 0xf8ff) continue; // Private use
    if (code >= 0xfb00 && code <= 0xfb4f) continue; // Ligatures
    console.log('Confusable character found', elem.innerHTML[i]);
    flagElement(elem, 'Text contains confusable unicode characters', flaggedNodes);
  }
}


/**
 * Flag element
 * @param {object} elem         SVG element
 * @param {string} message      Message
 * @param {array}  flaggedNodes Already flagged nodes
 */
function flagElement(elem, message, flaggedNodes) {
  var $svg = $(elem.viewportElement);
  var $container = $preview.find('[data-page="' + $svg.data('page') + '"]');

  // Check whether flag already exists or not
  var flagIndex = flaggedNodes.indexOf(elem.parentNode);
  if (flagIndex > -1) {
    var $flag = $container.find('.flag[data-flag=' + flagIndex + ']');
    $flag.append(elem.innerHTML);
    if ($flag.attr('title').indexOf(message) < 0) {
      $flag.attr('title', $flag.attr('title') + '\n' + message);
    }
    return;
  }
  flagIndex = flaggedNodes.push(elem.parentNode) - 1;

  // Create new flag DOM element
  var rect = elem.getBoundingClientRect();
  $('<div class="flag" data-flag="' + flagIndex + '" />').css({
    left: toPercent(rect.x, $svg.width()),
    top: toPercent(rect.top, $svg.height()),
    width: toPercent(rect.width, $svg.width()),
    height: toPercent(rect.height, $svg.height())
  }).html(elem.innerHTML).attr('title', message).appendTo($container);
}


/**
 * Analyze page
 * @param  {object}  page Page object
 * @return {Promise}      Callback
 */
function analyzeAnnotations(page) {
  var $container = $preview.find('[data-page="' + (page.pageIndex+1) + '"]');
  var annText = 'Annotations and form fields may not be read by plagiarism ' +
    'detection applications';
  return new Promise(function(resolve) {
    page.getAnnotations().then(function(ann) {
      for (var i=0; i<ann.length; i++) {
        var type = ann[i].subtype;
        if (type == 'Link') continue;

        var rect = ann[i].rect;
        var view = page.view;
        rect = pdfjs.Util.normalizeRect([
          rect[0],
          view[3] - rect[1] + view[1],
          rect[2],
          view[3] - rect[3] + view[1]
        ]);
        $('<div class="flag" />').css({
          left: toPercent(rect[0], view[2]),
          top: toPercent(rect[1], view[3]),
          width: toPercent(rect[2] - rect[0], view[2]),
          height: toPercent(rect[3] - rect[1], view[3])
        }).html(ann[i].fieldValue).attr('title', annText).appendTo($container);
      }
      resolve();
    });
  });
}


/******************************************************************************
 *** OTHER FUNCTIONS **********************************************************
 ******************************************************************************/


/**
 * Resize preview pages
 * @return {boolean} Success
 */
function resizePreviewPages() {
  var previewWidth = $preview.width();
  if (previewWidth == 0) return false;

  $preview.find('.page').each(function() {
    var newWidth = Math.min(previewWidth - 40, $(this).data('maxWidth'), 600);
    var newHeight = newWidth / $(this).data('proportion');
    $(this).css({
      width: newWidth,
      height: newHeight
    });
  });
  return true;
}


/**
 * To percent string
 * @param  {float}  value Value
 * @param  {float}  total Total unit value
 * @return {string}       Percent string
 */
function toPercent(value, total) {
  return ((value / total) * 100) + '%';
}


/**
 * Get color brightness
 * @param  {string} color RGB color string
 * @return {int}          Brightness (from 0 top 255)
 */
function getColorBrightness(color) {
  if (color === null) color = 'rgb(0,0,0)';
  color = color.replace(/rgb\((.+)\)/g, '$1').split(',');
  return (299*color[0] + 587*color[1] + 114*color[2]) / 1000;
}


/**
 * Update flag counter
 * @param {int} pageNum Page number
 */
function updateFlagCounter(pageNum) {
  var count = $preview.find('[data-page=' + pageNum + '] .flag').length;
  if (count > 0) {
    $navigation.find('[data-page=' + pageNum + ']')
      .append('<div class="counter">' + count + '</div>');
  }
}


/**
 * Update total flag counter
 */
function updateTotalFlagCounter() {
  var total = $preview.find('.flag').length;
  var totalText = (total == 1) ? '1 issue' : total + ' issues';
  $topbar.find('.item-issues').html(totalText)
    .toggleClass('ok', (total == 0)).show();
}


/******************************************************************************/

module.exports = {
  loadDocument: loadDocument
};
