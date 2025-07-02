const fs = require("fs");
const path = require("path");

function rebuildSources(dir) {
  function rebuildSourcesDir(dir, mainDir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        rebuildSourcesDir(fullPath, mainDir);
      } else if (file.isFile() && path.extname(file.name) === ".ink") {
        const content = fs.readFileSync(fullPath, "utf8");
        sourceFiles.push({
          fileName: path.relative(mainDir, fullPath), // do not include full
          // path for extra privacy :)
          content,
        });
      }
    }
  }

  const sourceFiles = [];

  dir = path.join(dir);
  rebuildSourcesDir(dir, dir);

  const content = "$_inkSources = " + JSON.stringify(sourceFiles);
  fs.writeFileSync(path.join(dir, "auto-ink-sources.js"), content, "utf8");
}

module.exports = rebuildSources;
