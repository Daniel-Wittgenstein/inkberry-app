function normalizeProjectPathAppearance(n) {
  return n.replaceAll("\\", "/");
}

module.exports = { normalizeProjectPathAppearance };
