var $ = require('jquery');
var $container = $('body > .dialogs');

// Add events
$container.click(function() {
  closeDialog();
}).on('click', '.dialog', function(e) {
  e.stopPropagation();
});
$(document).keyup(function(e) {
  if ((e.which == 27) && isDialogVisible()) { // Escape pressed
    closeDialog();
  }
});


/**
 * Show dialog
 * @param {string} title   Dialog title
 * @param {string} message Dialog message
 */
function showDialog(title, message) {
  $container.show().html('<div class="dialog"><div class="title">' + title +
    '</div><div class="body">' + message + '</div></div>');
  setTimeout(function() {
    $container.addClass('visible');
    $container.find('.dialog').addClass('visible');
  }, 0);
}


/**
 * Is dialog visible
 * @return {boolean} Is visible
 */
function isDialogVisible() {
  return ($container.find('.dialog').length > 0);
}


/**
 * Close dialog
 */
function closeDialog() {
  $container.find('.dialog').removeClass('visible');
  $container.removeClass('visible');
  setTimeout(function() {
    $container.empty().hide();
  }, 500);
}


/******************************************************************************/

module.exports = {
  show: showDialog,
  close: closeDialog,
  isVisible: isDialogVisible
};
