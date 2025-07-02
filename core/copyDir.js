const ncp = require("ncp").ncp;

const ncpPromise = (source, destination) => {
  return new Promise((resolve, reject) => {
    ncp(source, destination, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

async function copyDir(sourceDir, destDir) {
  try {
    await ncpPromise(sourceDir, destDir);
    console.log("Files copied successfully!");
  } catch (error) {
    console.error("Error copying files:", error);
  }
}

module.exports = { copyDir };
