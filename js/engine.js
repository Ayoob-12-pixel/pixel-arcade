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
    let crashed = false;
    game.start(ctx, { ...env, canvas, keys, pressed, mouse });

    function frame(t) {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      if (!crashed) {
        try {
          if (current && current.update) current.update(dt);
          if (current && current.render) current.render();
        } catch (err) {
          crashed = true;
          console.error("[Arcade] game crashed:", err);
          ctx.fillStyle = "rgba(0,0,0,.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
          text(ctx, "A GLITCH OCCURRED", canvas.width / 2, canvas.height / 2 - 40, 26, "#ff6b6b", "center");
          text(ctx, String(err && err.message || err).slice(0, 80), canvas.width / 2, canvas.height / 2, 14, "#ffd166", "center");
          text(ctx, "Press ESC for menu — please report this.", canvas.width / 2, canvas.height / 2 + 34, 13, "#8b949e", "center");
        }
      }
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

  // outlined pixel box — gives sprites depth without looking blocky
  function obox(ctx, x, y, w, h, fill, ol) {
    ctx.fillStyle = ol || "#161320";
    ctx.fillRect((x - 1) | 0, (y - 1) | 0, Math.ceil(w + 2), Math.ceil(h + 2));
    ctx.fillStyle = fill;
    ctx.fillRect(x | 0, y | 0, Math.ceil(w), Math.ceil(h));
  }

  // draw a string-grid sprite scaled up (Terraria-style pixel art)
  function spr(ctx, grid, palette, x, y, px, flip) {
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === " " || ch === ".") continue;
        const col = palette[ch];
        if (!col) continue;
        const cx = flip ? (row.length - 1 - c) : c;
        ctx.fillStyle = col;
        ctx.fillRect((x + cx * px) | 0, (y + r * px) | 0, px, px);
      }
    }
  }

  // deterministic hash for stable procedural detail (grass tufts, etc.)
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  return {
    games, run, stop, bindMouse,
    rand, clamp, dist, rectFill, text, obox, spr, hash,
  };
})();
