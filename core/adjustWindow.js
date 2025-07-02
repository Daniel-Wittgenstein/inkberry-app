const { screen, BrowserWindow } = require("electron");

function adjustWindow(mode) {
  let win = BrowserWindow.getFocusedWindow();
  if (!win) return;

  const display = screen.getDisplayMatching(win.getBounds());
  const { width, height, x, y } = display.workArea;

  const newX = mode === "right" ? x + width / 2 : x;

  if (win.isFullScreen()) {
    win.setFullScreen(false);
  }

  if (win.isMaximized()) {
      win.restore();
  }

  win.setBounds({ x: newX, y, width: width / 2, height });
}

module.exports = adjustWindow;
