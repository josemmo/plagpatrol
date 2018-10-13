import './styles/main.scss';

var $ = require('jquery');
$(function() {

  var viewer = require('./viewer.js');
  var $welcomePage = $('.page[data-page="welcome"]');
  var $topbar = $('body > .topbar');


  /* DRAG AND DROP FILE */
  $('body').on('dragover', false).on('drop', function(e) {
    e.preventDefault();

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
    alert(APP_NAME + ' v' + APP_VERSION + '\n\n' +
      'Source code is available at https://github.com/josemmo/plagpatrol');
  });

});
