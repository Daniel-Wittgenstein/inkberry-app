function normalizeProjectPathAppearance(n) {
  //purely cosmetic.
  return n.replaceAll("\\", "/");
}

export default normalizeProjectPathAppearance;
