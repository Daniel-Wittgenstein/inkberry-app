const fs = require('fs');
const path = require('path');

function createTimestampedDir(parentDir, dirName) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  const year = now.getFullYear();
  const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());

  // Avoid ":" because of Windows:
  const baseName = `${dirName} ${year} ${month} ${day} --- ${hour}-${minute}`;
  let finalName = baseName;
  let fullPath = path.join(parentDir, finalName);
  let counter = 1;

  while (fs.existsSync(fullPath)) {
    finalName = `${baseName} (${counter++})`;
    fullPath = path.join(parentDir, finalName);
  }

  fs.mkdirSync(fullPath, { recursive: true });
  return fullPath;
}

module.exports = createTimestampedDir;
