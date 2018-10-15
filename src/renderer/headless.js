/**
 * Is running on desktop
 * @return {boolean} Running on desktop
 */
function isDesktop() {
  return (typeof window.ipcRenderer !== 'undefined');
}


/**
 * Get file path to open automatically
 * @return {string|null} Path to open
 */
function getPathToOpen() {
  if (!isDesktop()) return null;
  return window.ipcRenderer.sendSync('synchronous-message', 'getPathToOpen');
}


/******************************************************************************/


module.exports = {
  isDesktop: isDesktop,
  getPathToOpen: getPathToOpen
}
