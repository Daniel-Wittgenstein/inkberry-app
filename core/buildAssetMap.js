
const { dialog } = require('electron')
const fs = require('fs');
const path = require('path');


function buildAssetMap(pathToStoryFolder) {

  if (!pathToStoryFolder) {
    dialog.showMessageBox({ message: "No open project. Cannot build assets." })
    return
  }

  const assetMapFileName = path.join(pathToStoryFolder, '_xAssetMap.js');

  let assetMap
  //try {
    assetMap = generateAssetMap(pathToStoryFolder)
  /*} catch(err) {
    dialog.showMessageBox({ message: "Error: could not generate asset map." })
    return;
  }*/
  const jsonStr = JSON.stringify(assetMap, null, 2)
  const saferJsonStr = jsonStr.replace(/`/g, '\\`')
  const content = "var _$_xAssetMap = `" + saferJsonStr + "`"
  fs.writeFileSync(assetMapFileName, content, "utf8");
  dialog.showMessageBox({ message: "Asset map created successfully!" })
}


function getAssetType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const imageExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const audioExt = ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
  const videoExt = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  if (imageExt.includes(ext)) {
    return 'image';
  }
  if (audioExt.includes(ext)) {
    return 'audio';
  }
  if (videoExt.includes(ext)) {
    return 'video';
  }
  return 'other';
}


function sanitizeKey(fileName) {
  return fileName.replaceAll("\\", "/")
}


function generateAssetMap(mainPath) {

  function generateAssetMapRec(subPath) {

    const entries = fs.readdirSync(subPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(subPath, entry.name);

      if (entry.isDirectory()) {

        generateAssetMapRec(fullPath);

      } else {

        const fileContent = fs.readFileSync(fullPath);
        const base64 = fileContent.toString('base64');
        const type = getAssetType(fullPath);

        if (type === "other") {
          continue
        }

        const key = sanitizeKey(path.relative(mainPath, fullPath));

        finalMap[key] = {
          type,
          value: base64,
        };

      }
    }

    return finalMap;
  }

  const finalMap = {}
  generateAssetMapRec(mainPath)
  return finalMap

}


module.exports = buildAssetMap;
