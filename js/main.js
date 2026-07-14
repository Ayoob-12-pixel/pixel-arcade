/* ============================================================
   MAIN — menu routing & shared UI (HUD / overlay / back)
   ============================================================ */
(function () {
  const menu = document.getElementById("menu");
  const gameScreen = document.getElementById("game");
  const canvas = document.getElementById("canvas");
  const backBtn = document.getElementById("backBtn");
  const gameTitle = document.getElementById("gameTitle");
  const hud = document.getElementById("hud");
  const controls = document.getElementById("controls");
  const overlay = document.getElementById("overlay");

  Arcade.bindMouse(canvas);

  // Environment handed to each game so it can drive shared UI.
  const env = {
    setHud: (s) => { hud.textContent = s; },
    setControls: (s) => { controls.innerHTML = s; },
    showOverlay: (html) => { overlay.innerHTML = html; overlay.classList.remove("hidden"); },
    hideOverlay: () => { overlay.classList.add("hidden"); },
    onOverlayClick: (fn) => { overlay.onclick = fn; },
  };

  function openGame(name) {
    const game = Arcade.games[name];
    if (!game) return;
    menu.classList.remove("active");
    gameScreen.classList.add("active");
    gameTitle.textContent = game.title || name;
    controls.innerHTML = game.controls || "";
    hud.textContent = "";
    overlay.classList.add("hidden");
    overlay.onclick = null;
    canvas.focus();
    Arcade.run(canvas, name, env);
  }

  function backToMenu() {
    Arcade.stop();
    overlay.classList.add("hidden");
    overlay.onclick = null;
    gameScreen.classList.remove("active");
    menu.classList.add("active");
  }

  document.querySelectorAll(".card").forEach((c) => {
    c.addEventListener("click", () => openGame(c.dataset.game));
  });
  backBtn.addEventListener("click", backToMenu);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && gameScreen.classList.contains("active")) backToMenu();
  });
})();
