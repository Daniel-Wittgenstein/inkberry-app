const fs = require("fs");
const path = require("path");

function autoDetectEntryFile(filePath) {
  const startStr = `var storyContent = {"inkVersion":`;
  let files = fs.readdirSync(filePath).filter((file) => file.endsWith(".js"));
  for (let file of files) {
    let fullPath = path.join(filePath, file);
    let content = fs.readFileSync(fullPath, "utf8");
    if (content.startsWith(startStr)) {
      return file;
    }
  }
  return false;
}

module.exports = { autoDetectEntryFile };
