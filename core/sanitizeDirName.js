function sanitizeDirName(name) {
  // Remove characters not allowed in Windows/macOS/Linux directory names
  // Forbidden: / \ : * ? " < > | and control chars
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
}

module.exports = sanitizeDirName;
