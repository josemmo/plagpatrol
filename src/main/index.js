const {app, BrowserWindow} = require('electron')
const {autoUpdater} = require('electron-updater')
let win


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
  for (const param of process.argv) {
    if (param == '--open-dev-tools') {
      win.webContents.openDevTools()
      break
    }
  }

  // Attach events
  win.on('closed', () => {
    win = null
  })
  win.once('ready-to-show', () => {
    win.show()
  })
  win.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })
}


/* INITIALIZE APP */
app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify()
  createWindow()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { // Keep app running when on MacOS
    app.quit()
  }
})
app.on('activate', () => {
  if (win === null) { // Create window when dock icon clicked on MacOS
    createWindow()
  }
})
