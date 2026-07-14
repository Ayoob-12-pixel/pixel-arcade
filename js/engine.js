/* ============================================================
   ENGINE — shared input, loop, HUD & overlay helpers
   Each game registers itself as Arcade.games[name] = { title, controls, start(ctx,env), stop() }
   ============================================================ */
window.Arcade = (function () {
  const games = {};

  // --- Input state (shared) ---
  const keys = {};
  const pressed = {}; // one-shot: true only on the frame a key goes down
  const mouse = { x: 0, y: 0, down: false, clicked: false, right: false, rclick: false };

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
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("mousedown", (e) => { setPos(e); if (e.button === 2) { mouse.right = true; mouse.rclick = true; } else { mouse.down = true; mouse.clicked = true; } });
    canvas.addEventListener("mouseup", (e) => { if (e.button === 2) mouse.right = false; else mouse.down = false; });
    canvas.addEventListener("touchstart", (e) => { setPos(e); mouse.down = true; mouse.clicked = true; e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", (e) => { setPos(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchend", () => { mouse.down = false; });
  }

  // --- Loop control ---
  let rafId = null;
  let current = null;

  function clearOneShots() { for (const k in pressed) pressed[k] = false; mouse.clicked = false; mouse.rclick = false; }

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
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const tl = hash(xi, yi), tr = hash(xi + 1, yi), bl = hash(xi, yi + 1), br = hash(xi + 1, yi + 1);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (tl * (1 - u) + tr * u) * (1 - v) + (bl * (1 - u) + br * u) * v;
  }
  function fbm(x, y) { let a = 0, amp = 0.5, f = 1; for (let i = 0; i < 4; i++) { a += noise2(x * f, y * f) * amp; f *= 2; amp *= 0.5; } return a; }

  // ---- procedural ISLAND: irregular coastline + biomes (not a square) ----
  function island(W, H, seed) {
    const s1 = hash(seed, 1) * 6.28, s2 = hash(seed, 2) * 6.28, s3 = hash(seed, 3) * 6.28, s4 = hash(seed, 8) * 6.28;
    const nx = hash(seed, 4) * 900, ny = hash(seed, 5) * 900;
    const cx = W / 2, cy = H / 2;
    function elev(x, y) {
      const dx = (x - cx) / (W * 0.46), dy = (y - cy) / (H * 0.46);
      const d = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx);
      const coast = 0.60 + 0.20 * Math.sin(ang * 3 + s1) + 0.11 * Math.sin(ang * 5 + s2) + 0.06 * Math.sin(ang * 7 + s3) + 0.05 * Math.sin(ang * 2 + s4);
      const n = fbm(x * 0.0016 + nx, y * 0.0016 + ny);
      return (coast - d) + (n - 0.5) * 0.5;
    }
    function biome(x, y) {
      const e = elev(x, y);
      if (e < 0) return "ocean";
      if (e < 0.05) return "sand";
      const lake = fbm(x * 0.0032 + nx + 50, y * 0.0032 + ny + 50);
      if (e > 0.08 && e < 0.5 && lake < 0.30) return "water";
      if (e > 0.62) return "peak";
      if (e > 0.5) return "rock";
      const fo = fbm(x * 0.004 + nx + 9, y * 0.004 + ny + 9);
      if (e > 0.26 && fo > 0.56) return "forest";
      return "grass";
    }
    function passable(x, y) { const b = biome(x, y); return b !== "ocean" && b !== "water" && b !== "peak"; }
    function findLand(pred, tries, salt) {
      tries = tries || 600; salt = salt || 0;
      for (let i = 0; i < tries; i++) {
        const x = 200 + hash(seed + salt + i, 11) * (W - 400), y = 200 + hash(seed + salt + i, 12) * (H - 400);
        if (passable(x, y) && (!pred || pred(x, y, biome(x, y)))) return { x, y };
      }
      return { x: cx, y: cy };
    }
    return { W, H, seed, elev, biome, passable, findLand, cx, cy };
  }
  const BIOME_COL = {
    ocean: "#1b3a5c", ocean2: "#22496e", water: "#2f6a8f", sand: "#d9c48a",
    grass: "#3f7a43", grass2: "#367039", forest: "#245c31", rock: "#6b6660", peak: "#8f8a84",
  };
  function biomeColor(b, v) {
    let c = BIOME_COL[b] || "#3f7a43";
    if (b === "grass") c = v > 0.7 ? "#478850" : v < 0.28 ? BIOME_COL.grass2 : c;
    else if (b === "forest") c = v > 0.6 ? "#2b6a39" : c;
    else if (b === "rock") c = v > 0.6 ? "#7a746c" : v < 0.3 ? "#5c584f" : c;
    else if (b === "sand") c = v > 0.6 ? "#e6d29a" : c;
    else if (b === "ocean") c = v > 0.5 ? BIOME_COL.ocean2 : c;
    return c;
  }

  // ---- detailed pixel character (Terraria-ish), unit space scaled by S ----
  function drawHumanoid(ctx, x, y, face, pal, S, t, act) {
    act = act || {};
    const build = pal.build || 1;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face < 0 ? -1 : 1, 1); ctx.scale(S, S);
    const P = (gx, gy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(gx, gy, w, h); };
    const O = (gx, gy, w, h, c) => { ctx.fillStyle = "#0f0d16"; ctx.fillRect(gx - 0.6, gy - 0.6, w + 1.2, h + 1.2); ctx.fillStyle = c; ctx.fillRect(gx, gy, w, h); };
    const walk = t ? Math.sin(t * 11) : 0;
    const swing = act.atk ? Math.sin(act.atk * Math.PI) : 0;
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(0, 12, 7 * build, 2.4, 0, 0, 7); ctx.fill();
    const ll = Math.max(0, 2 * walk), rl = Math.max(0, -2 * walk);
    P(-3, 4 + ll, 2.6, 6 - ll, pal.pants); O(-3, 9 + ll, 2.6, 2, pal.boot);
    P(0.6, 4 + rl, 2.6, 6 - rl, pal.pantsSh); O(0.6, 9 + rl, 2.6, 2, pal.boot);
    P(3.2 * build, -3 + rl, 2.4, 7, pal.clothSh);                 // back arm
    const tw = 8 * build;
    O(-tw / 2, -4, tw, 8, pal.cloth);
    P(-tw / 2, -4, tw, 2, pal.clothHi);
    P(tw / 2 - 2, -4, 2, 8, pal.clothSh);
    P(-tw / 2, 2, tw, 1.4, "#0000003a");
    if (pal.role === "knight") { O(-tw / 2 - 1.4, -5, 3, 3, pal.clothHi); O(tw / 2 - 1.6, -5, 3, 3, pal.clothHi); }
    if (pal.cape) { P(-tw / 2 - 1, -4, 1.6, 11, pal.cape); }
    P(-1.5, -6, 3, 2, pal.skinSh);                                // neck
    O(-3.2, -11, 6.4, 6, pal.skin);
    P(-3.2, -8, 6.4, 1.4, pal.skinSh);
    P(2.4, -9, 1.1, 1.6, pal.skinSh);                             // ear
    P(0.7, -9, 1.5, 1.5, "#141018");                             // eye
    // headgear by role
    const hair = pal.hair;
    if (pal.role === "wizard") { ctx.fillStyle = hair; ctx.beginPath(); ctx.moveTo(-4.5, -10.5); ctx.lineTo(0.5, -18); ctx.lineTo(4.5, -10.5); ctx.closePath(); ctx.fill(); P(-4.8, -11, 9.6, 1.6, biomeColor ? hair : hair); P(-5, -10.5, 10, 1, "#00000030"); }
    else if (pal.role === "knight") { O(-3.6, -12, 7.2, 4, pal.cloth); P(-3.6, -8.5, 7.2, 1.4, "#00000055"); P(0.2, -8.5, 1.2, 4, "#00000088"); }
    else if (pal.role === "archer") { O(-3.8, -12, 7.6, 3.2, hair); ctx.fillStyle = hair; ctx.beginPath(); ctx.moveTo(-3.8, -11); ctx.lineTo(-6.5, -6); ctx.lineTo(-2, -8); ctx.closePath(); ctx.fill(); P(2, -14, 1, 3, "#e6d24a"); }
    else if (pal.role === "cleric") { P(-3.4, -12, 6.8, 2, hair); P(-1, -14, 2, 2, "#ffe6a0"); }
    else { P(-3.4, -12, 6.8, 3, hair); P(-3.4, -9, 1.4, 3, hair); }
    // front arm + weapon (swings on attack)
    ctx.save(); ctx.translate(-tw / 2 + 0.6, -3); ctx.rotate(-swing * 1.25);
    P(0, 0, 2.4, 7, pal.cloth); P(0.3, 6.4, 2, 2, pal.skin);
    if (pal.weapon) drawWeaponSprite(ctx, pal.weapon, 1.2, 6.5);
    ctx.restore();
    if (act.block) { ctx.strokeStyle = "#8ad3ff"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, -1, 9.5, -1.2, 1.2); ctx.stroke(); ctx.lineWidth = 1; }
    ctx.restore();
  }
  // weapon drawn at the hand (local origin), pointing up (blade) / forward
  function drawWeaponSprite(ctx, w, hx, hy) {
    const P = (gx, gy, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(hx + gx, hy + gy, ww, hh); };
    const c = w.color || "#c9d1d9";
    if (w.type === "staff" || w.type === "wand") { P(-0.5, -12, 1.6, 14, "#6a4a2a"); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(hx + 0.3, hy - 12, 2.2, 0, 7); ctx.fill(); }
    else if (w.type === "bow") { ctx.strokeStyle = c; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(hx + 1, hy - 3, 8, -1.1, 1.1); ctx.stroke(); ctx.strokeStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(hx + 1, hy - 10.5); ctx.lineTo(hx + 1, hy + 4.5); ctx.stroke(); ctx.lineWidth = 1; }
    else if (w.type === "dagger") { P(-0.4, -6, 1.2, 6, c); P(-1, -0.5, 2.4, 1.2, "#6a4a2a"); }
    else if (w.type === "mace") { P(-0.4, -8, 1.4, 8, "#6a5030"); P(-1.4, -12, 3.4, 4, c); }
    else if (w.type === "axe") { P(-0.4, -12, 1.4, 13, "#6a4a2a"); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(hx + 1, hy - 12); ctx.lineTo(hx + 6, hy - 10); ctx.lineTo(hx + 1, hy - 6); ctx.closePath(); ctx.fill(); }
    else if (w.type === "pickaxe") { P(-0.4, -10, 1.3, 11, "#6a4a2a"); ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx + 0.5, hy - 10, 4, -0.2, 3.4); ctx.stroke(); ctx.lineWidth = 1; }
    else { const len = w.big ? 15 : 10; P(-0.5, -1, 1.6, 3, "#6a4a2a"); P(-1.8, -1.5, 4, 1.3, "#8a6a3a"); P(-0.6, -1 - len, 1.7, len, c); P(-0.6, -1 - len, 0.7, len, "#ffffff55"); }
  }

  return {
    games, run, stop, bindMouse,
    rand, clamp, dist, rectFill, text, obox, spr, hash, noise2, fbm,
    island, biomeColor, drawHumanoid, drawWeaponSprite,
  };
})();
