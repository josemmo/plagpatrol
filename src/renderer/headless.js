/**
 * Is running on desktop
 * @return {boolean} Running on desktop
 */
function isDesktop() {
  return (typeof window.ipcRenderer !== 'undefined');
}


/**
 * Is headless
 * @return {boolean} Is headless
 */
function isHeadless() {
  if (!isDesktop()) return false;
  return window.ipcRenderer.sendSync('isHeadless');
}


/**
 * Get file path to open automatically
 * @return {string|null} Path to open
 */
function getPathToOpen() {
  if (!isDesktop()) return null;
  return window.ipcRenderer.sendSync('getPathToOpen');
}


/**
 * Log message
 * @param  {string}  message Message
 * @return {boolean}         Success
 */
function log(message) {
  return window.ipcRenderer.sendSync('logMessage', message);
}


/**
 * Exit app
 */
function exit() {
  window.ipcRenderer.sendSync('exit');
}


/******************************************************************************/


module.exports = {
  isDesktop: isDesktop,
  isHeadless: isHeadless,
  getPathToOpen: getPathToOpen,
  log: log,
  exit: exit
}
