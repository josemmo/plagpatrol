const {app, BrowserWindow, ipcMain, shell} = require('electron')
const {autoUpdater} = require('electron-updater')
const fs = require('fs')
let win, args


/*** COMMON FUNCTIONS *********************************************************/


/**
 * Create app window
 */
function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    show: false
  })
  win.setMenu(null)
  win.loadFile('dist/index.html')

  // Enable dev tools
  if (args.openDevTools) win.webContents.openDevTools()

  // Attach events
  win.on('closed', () => {
    win = null
  })
  win.once('ready-to-show', () => {
    if (!args.headless) win.show()
  })
  win.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })
}


/**
 * Get path of file to open
 * @return {string|null} Path to open
 */
function getPathToOpen() {
  for (const param of process.argv.slice(1)) {
    if (param == '.' || param.indexOf('-') === 0) continue
    if (fs.existsSync(param)) return param
  }
  return null
}


/******************************************************************************/


// Parse arguments
args = {
  openDevTools: false,
  headless: false
}
for (const param of process.argv.slice(1)) {
  if (param == '-d' || param == '--open-dev-tools') {
    args.openDevTools = true
  } else if (param == '-h' || param == '--headless') {
    args.headless = true
  }
}

// Initialize app
app.on('ready', () => {
  if (!args.headless) {
    autoUpdater.logger = null
    autoUpdater.checkForUpdatesAndNotify()
  }
  createWindow()
})
app.on('window-all-closed', () => {
  app.quit()
})

// Headless operation
ipcMain.on('isHeadless', (e) => {
  e.returnValue = args.headless
})
ipcMain.on('getPathToOpen', (e) => {
  e.returnValue = getPathToOpen()
})
ipcMain.on('logMessage', (e, msg) => {
  console.log(msg)
  e.returnValue = true
})
ipcMain.on('exit', (e) => {
  win.close()
})
