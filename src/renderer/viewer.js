var $ = require('jquery');
var pdfjs = require('pdfjs-dist/webpack.js');
var dialog = require('./dialog.js');
var pagination = require('./pagination.js');
var headless = require('./headless.js');

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
    notifyHeadless(true);
    pagination.showPage('viewer');
    $navigation.scrollTop(0);
    $preview.scrollTop(0);
    var interval = setInterval(function() {
      if (resizePreviewPages()) clearInterval(interval);
    }, 80);
  }).catch(function() {
    notifyHeadless(false);
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
    previewHtml += '<div class="page" data-page="' + i + '"></div>';
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
        Promise.resolve(page), // To pass parameters between promises
        renderThumbnail(page).then(notifyJobFinished),
        renderPreview(page).then(notifyJobFinished)
      ]);
    }).then(function(res) {
      return analyzePage(res[0]).then(notifyJobFinished);
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
        // Get page canvas context
        var $canvas = $preview.find('[data-page="' + (page.pageIndex+1) + '"] canvas');
        var ctx = $canvas.get(0).getContext('2d');

        // Analyze TSPAN elements from SVG renderer
        var flaggedNodes = [];
        $(svg).find('*').each(function() {
          if (this.localName !== 'tspan') return true;
          analyzeTspan(this, ctx, flaggedNodes);
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
 * @param {object} ctx          Canvas context from page
 * @param {array}  flaggedNodes Already flagged nodes
 */
function analyzeTspan(elem, ctx, flaggedNodes) {
  var rect = elem.getBoundingClientRect();
  if (rect.width == 0 || rect.height == 0) return;
  var textLength = elem.innerHTML.replace(/[^a-zA-Z0-9]/g, '').length;

  // Get background color
  var fgBrightness = getColorBrightness(elem.getAttribute('fill'));
  var bgBrightness = getColorBrightness(getDominantColor(ctx, rect));
  var diffBrightness = Math.abs(bgBrightness - fgBrightness);
  if ((diffBrightness < 50) && (textLength > 0)) {
    console.log(elem.innerHTML, fgBrightness, bgBrightness, diffBrightness);
    flagElement(elem, 'Text is too bright to be read', flaggedNodes);
  }

  // Check font size
  var fontSize = elem.getAttribute('font-size');
  if ((fontSize !== null) && (fontSize.replace('px', '') <= 4) && (textLength > 100)) {
    flagElement(elem, 'Text is too small to be read', flaggedNodes);
  }

  // Detect homograph attacks
  for (var i=0; i<elem.innerHTML.length; i++) {
    var code = elem.innerHTML.charCodeAt(i);
    if (code <= 0x03ff) continue;
    if (code >= 0x2000 && code <= 0x2bff) continue; // Punct. signs and others
    if (code >= 0xd400 && code <= 0xd77f) continue; // Mathematical symbols
    if (code >= 0xe000 && code <= 0xf8ff) continue; // Private use
    if (code >= 0xfb00 && code <= 0xfb4f) continue; // Ligatures
    console.log('Confusable found', '0x' + code.toString(16), elem.innerHTML[i]);
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
    if ($flag.html().length < 6000) $flag.append(elem.innerHTML);
    if ($flag.attr('title').indexOf(message) < 0) {
      $flag.attr('title', $flag.attr('title') + '\n' + message);
    }
    return;
  }
  flagIndex = flaggedNodes.push(elem.parentNode) - 1;

  // Create new flag DOM element
  var rect = elem.getBoundingClientRect();
  $('<div class="flag" data-flag="' + flagIndex + '" />').css({
    left: toPercent(rect.left, $svg.width()),
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
 * Get dominant color
 * @param  {CanvasRenderingContext2D} ctx  Canvas context
 * @param  {DOMRect}                  rect Bounding rectangle
 * @return {array}                         Dominant color (in RGB)
 */
function getDominantColor(ctx, rect) {
  var freq = [{}, {}, {}], maxFreq = [-1, -1, -1], mode = [-1, -1, -1];

  var data = ctx.getImageData(rect.x, rect.y, rect.width, rect.height).data;
  for (var i=0; i<data.length; i+=4) {
    for (var j=0; j<3; j++) {
      freq[j][data[i+j]] = (freq[j][data[i+j]] || 0) + 1;
      if (freq[j][data[i+j]] > maxFreq[j]) {
        maxFreq[j] = freq[j][data[i+j]];
        mode[j] = data[i+j];
      }
    }
  }

  return mode;
}


/**
 * Get color brightness
 * @param  {string|array} color RGB color
 * @return {int}                Brightness (from 0 top 255)
 */
function getColorBrightness(color) {
  if (color === null) color = 'rgb(0,0,0)';
  if (typeof color == 'string') {
    color = color.replace(/rgb\((.+)\)/g, '$1').split(',');
  }
  return (299*color[0] + 587*color[1] + 114*color[2]) / 1000;
}


/**
 * Update flag counter
 * @param {int} pageNum Page number
 */
function updateFlagCounter(pageNum) {
  var count = $preview.find('[data-page=' + pageNum + '] .flag').length;
  var $elem = $navigation.find('[data-page=' + pageNum + ']').data('count', count);
  if (count > 0) $elem.append('<div class="counter">' + count + '</div>');
}


/**
 * Update total flag counter
 */
function updateTotalFlagCounter() {
  var total = $preview.find('.flag').length;
  var totalText = (total == 1) ? '1 issue' : total + ' issues';
  $topbar.find('.item-issues').html(totalText).data('count', total)
    .toggleClass('ok', (total == 0)).show();
}


/**
 * Notify headless operator of result
 * @param {boolean} success Success
 */
function notifyHeadless(success) {
  if (!headless.isHeadless()) return;

  // Prepare message
  var res = {success: success};
  if (success) {
    res.totalPages = $navigation.find('.thumbnail').length;
    res.totalIssues = $topbar.find('.item-issues').data('count');
    res.pages = [];
    $navigation.find('.thumbnail').each(function() {
      res.pages.push({
        number: $(this).data('page'),
        issues: $(this).data('count'),
      });
    });
  }

  // Log and exit
  headless.log(JSON.stringify(res));
  headless.exit();
}


/******************************************************************************/

module.exports = {
  loadDocument: loadDocument
};
