/* ============================================================
   ENGINE — shared input, loop, HUD & overlay helpers
   Each game registers itself as Arcade.games[name] = { title, controls, start(ctx,env), stop() }
   ============================================================ */
window.Arcade = (function () {
  const games = {};

  // --- Input state (shared) ---
  const keys = {};
  const pressed = {}; // one-shot: true only on the frame a key goes down
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  function bindMouse(canvas) {
    const scale = () => canvas.width / canvas.getBoundingClientRect().width;
    function setPos(e) {
      const r = canvas.getBoundingClientRect();
      const s = scale();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX);
      const cy = (e.touches ? e.touches[0].clientY : e.clientY);
      mouse.x = (cx - r.left) * s;
      mouse.y = (cy - r.top) * s;
    }
    canvas.addEventListener("mousemove", setPos);
    canvas.addEventListener("mousedown", (e) => { setPos(e); mouse.down = true; mouse.clicked = true; });
    canvas.addEventListener("mouseup", () => { mouse.down = false; });
    canvas.addEventListener("touchstart", (e) => { setPos(e); mouse.down = true; mouse.clicked = true; e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", (e) => { setPos(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchend", () => { mouse.down = false; });
  }

  // --- Loop control ---
  let rafId = null;
  let current = null;

  function clearOneShots() { for (const k in pressed) pressed[k] = false; mouse.clicked = false; }

  function run(canvas, gameName, env) {
    stop();
    const game = games[gameName];
    if (!game) { console.error("No game:", gameName); return; }
    current = game;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (const k in keys) keys[k] = false;
    clearOneShots();

    let last = 0;
    game.start(ctx, { ...env, canvas, keys, pressed, mouse });

    function frame(t) {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      if (current && current.update) current.update(dt);
      if (current && current.render) current.render();
      clearOneShots();
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (current && current.stop) current.stop();
    current = null;
  }

  // --- Helpers ---
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function rectFill(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

  // pixel-text helper
  function text(ctx, str, x, y, size, color, align) {
    ctx.fillStyle = color || "#fff";
    ctx.font = `bold ${size || 16}px "Courier New", monospace`;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(str, x, y);
  }

  return {
    games, run, stop, bindMouse,
    rand, clamp, dist, rectFill, text,
  };
})();
