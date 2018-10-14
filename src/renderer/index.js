import './../styles/main.scss';

var $ = require('jquery');
$(function() {

  var viewer = require('./viewer.js');
  var dialog = require('./dialog.js');
  var $welcomePage = $('.page[data-page="welcome"]');
  var $topbar = $('body > .topbar');


  /* DRAG AND DROP FILE */
  $('body').on('dragover', false).on('drop', function(e) {
    e.preventDefault();
    if (dialog.isVisible()) dialog.close();

    // Get dragged file
    var file = null;
    var dataTransfer = e.originalEvent.dataTransfer;
    if (dataTransfer.items) {
      for (var i=0; i<dataTransfer.items.length; i++) {
        if (dataTransfer.items[i].kind === 'file') {
          file = dataTransfer.items[i].getAsFile();
          break;
        }
      }
    } else if (dataTransfer.files.length > 0) {
      file = dataTransfer.files[0];
    }

    // Load file
    if (file !== null) viewer.loadDocument(file);
  });


  /* OPEN FILE DIALOG */
  $welcomePage.find('.filepicker').change(function() {
    if (this.files && this.files.length > 0) viewer.loadDocument(this.files[0]);
    this.value = '';
    this.type = '';
    this.type = 'file';
  });

  /**
   * Show open file dialog
   */
  function openFile() {
    $welcomePage.find('.filepicker').trigger('click');
  }
  $welcomePage.find('.lead').click(openFile);
  $topbar.find('.item-open').click(openFile);


  /* ABOUT DIALOG */
  $topbar.find('.item-about').click(function() {
    dialog.show('About',
      '<div class="app-logo"></div>' +
      '<h1>' + APP_NAME + ' <small>v' + APP_VERSION + '</small></h1>' +
      '<p>Created and mantained by <a href="https://github.com/josemmo/" target="_blank">@josemmo</a>.</p>' +
      '<p>Source code is available under the MIT license at ' +
      '<a href="https://github.com/josemmo/plagpatrol" target="_blank">https://github.com/josemmo/plagpatrol</a></p>');
  });

});
