const fs = require("fs");

let settingsPath = "";

function init(newSettingsPath) {
  settingsPath = newSettingsPath;
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function loadSettings() {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath));
    } catch (err) {
      console.log(
        `User settings file at "${settingsPath}" exists, but ` +
          `is not a valid JSON file? Parsing JSON failed. ` +
          `This is harmless. Continuing with default user settings.`,
      );
      return null;
    }
  }
  return null;
}

function deleteFile() {
  if (fs.existsSync(settingsPath)) {
    try {
      fs.unlinkSync(settingsPath);
      console.log(`Deleted: ${settingsPath}`);
    } catch (error) {
      console.error(`Error deleting file: ${error}`);
    }
  }
}

module.exports = { init, saveSettings, loadSettings, deleteFile };
