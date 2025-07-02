function switchToScreen(screenId) {
  document.querySelectorAll(".screen").forEach((item) => {
    item.style.display = "none";
  });
  document.getElementById(screenId).style.display = "block";
}

export default switchToScreen;
