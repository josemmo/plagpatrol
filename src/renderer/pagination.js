var $ = require('jquery');

/**
 * Show page
 * @param {string} page Page name
 */
function showPage(page) {
  $('.page.visible').removeClass('visible');
  $('.page[data-page="' + page + '"]').addClass('visible');
}


/******************************************************************************/


module.exports = {
  showPage: showPage
};
