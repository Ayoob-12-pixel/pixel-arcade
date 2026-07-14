/* ============================================================
   GAME 2 — BATTLE DROP  (2D battle royale on an ISLAND)
   Everyone drops in with NOTHING (bare fists) on a large
   irregular island. Loot guns & shields at named POIs, carry up
   to 3 weapons on a hotbar, out-play human-like bots, and
   survive the shrinking storm. Open the MAP (M/Tab) any time.
   ============================================================ */
(function () {
  const { rand, clamp, dist, rectFill, text, hash, island, biomeColor, drawHumanoid } = Arcade;
  const W = 960, H = 600;
  const MAP_W = 3600, MAP_H = 3200;

  const FIST = { name: "Fists", melee: true, dmg: 11, rate: 0.34, range: 26, color: "#e0a878" };
  const GUNS = {
    pickaxe: { name: "Pickaxe", melee: true, dmg: 30, rate: 0.42, range: 40, color: "#b98a5a" },
    pistol:  { name: "Pistol",  dmg: 20, rate: 0.40, spread: 0.05, speed: 640, mag: 12, reload: 1.1, range: 300, color: "#8b949e" },
    smg:     { name: "SMG",     dmg: 12, rate: 0.10, spread: 0.13, speed: 660, mag: 30, reload: 1.4, range: 260, color: "#79c0ff" },
    rifle:   { name: "Rifle",   dmg: 32, rate: 0.48, spread: 0.03, speed: 840, mag: 20, reload: 1.8, range: 460, color: "#a371f7" },
    shotgun: { name: "Shotgun", dmg: 8,  rate: 0.72, spread: 0.26, speed: 560, mag: 6,  reload: 1.9, range: 170, pellets: 8, color: "#ff7b4a" },
    sniper:  { name: "Sniper",  dmg: 80, rate: 1.25, spread: 0.005, speed: 1100, mag: 5, reload: 2.4, range: 700, color: "#ffd166" },
  };
  const GK = ["pickaxe", "pistol", "smg", "rifle", "shotgun", "sniper"];
  const POI_NAMES = ["Lighthouse", "Fishing Village", "Old Ruins", "Hilltop Fort", "Beach Camp", "Cave Mouth", "Watchtower", "Shipwreck"];

  let ctx, env, keys, pressed, mouse;
  let isl, player, cam, bots, bullets, loot, obst, pois, particles, storm, over, kills, alive, showMap;

  function mkGun(key) { const g = GUNS[key]; return { key, ...g, ammo: g.mag, reloading: 0 }; }
  function curGun() { return player.slots[player.cur] || FIST; }

  function reset() {
    isl = island(MAP_W, MAP_H, 21);
    const sp = isl.findLand((x, y, b) => b === "sand" || b === "grass");
    player = { x: sp.x, y: sp.y, r: 13, spd: 235, hp: 100, shield: 0, aim: 0, slots: [null, null, null], cur: 0, cd: 0, swing: 0 };
    cam = { x: 0, y: 0 }; bots = []; bullets = []; loot = []; particles = []; obst = []; over = null; kills = 0; showMap = false;

    // obstacles (cover): trees in forest, rocks in rock biome
    for (let i = 0; i < 600; i++) { const x = rand(80, MAP_W - 80), y = rand(80, MAP_H - 80); const b = isl.biome(x, y); if (b === "forest" && hash(i, 1) < 0.5) obst.push({ x, y, r: 14, t: "tree" }); else if (b === "rock" && hash(i, 2) < 0.25) obst.push({ x, y, r: 16, t: "rock" }); }

    // POIs with loot clusters
    pois = []; let salt = 200;
    POI_NAMES.forEach((nm, i) => {
      let s; for (let t = 0; t < 30; t++) { s = isl.findLand(null, 600, salt++); if (!pois.some((p) => dist(p.x, p.y, s.x, s.y) < 500)) break; }
      pois.push({ name: nm, x: s.x, y: s.y, kind: ["light", "village", "ruins", "fort", "camp", "cave", "tower", "wreck"][i] });
      for (let k = 0; k < 5; k++) { const a = rand(0, 6.28), d = rand(20, 90); const lx = s.x + Math.cos(a) * d, ly = s.y + Math.sin(a) * d; if (!isl.passable(lx, ly)) continue; if (Math.random() < 0.6) loot.push({ x: lx, y: ly, kind: "gun", gun: GK[1 + ((Math.random() * (GK.length - 1)) | 0)] }); else loot.push({ x: lx, y: ly, kind: "shield" }); }
    });
    // sparse open-world loot
    for (let i = 0; i < 26; i++) { const s = isl.findLand(null, 600, 900 + i); loot.push({ x: s.x, y: s.y, kind: Math.random() < 0.6 ? "gun" : "shield", gun: GK[(Math.random() * GK.length) | 0] }); }

    for (let i = 0; i < 24; i++) spawnBot();
    alive = bots.length + 1;
    storm = { cx: isl.cx, cy: isl.cy, r: Math.hypot(MAP_W, MAP_H) / 2, target: 240, shrink: 22 };
    env.setControls("Drop in with <b>FISTS</b> — loot guns at POIs! · <b>WASD</b> move · <b>Mouse</b> aim · <b>Click</b> fire · <b>1/2/3</b>/<b>Q</b> weapon · <b>R</b> reload · <b>M</b> map");
  }

  function spawnBot() {
    let x, y, t = 0;
    do { x = rand(80, MAP_W - 80); y = rand(80, MAP_H - 80); t++; } while ((dist(x, y, player.x, player.y) < 500 || !isl.passable(x, y)) && t < 80);
    if (!isl.passable(x, y)) return;
    bots.push({ x, y, r: 13, hp: 100, spd: rand(150, 200), gun: null, lootT: rand(2, 12),
      state: "roam", reactT: 0, fireCd: rand(0, 1), strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rand(0.6, 1.6),
      skill: rand(0.35, 0.82), wanderA: rand(0, 6.28), wanderT: 0, lostT: 0 });
  }
  function botGun(b) { return b.gun || FIST; }

  function start(c, e) { ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse; reset(); env.hideOverlay(); }

  function passMove(x, y) { if (!isl.passable(x, y)) return false; for (const o of obst) if (dist(x, y, o.x, o.y) < o.r) return false; return true; }
  function bulletBlocked(x, y) { if (isl.biome(x, y) === "peak") return true; for (const o of obst) if (o.t === "rock" && dist(x, y, o.x, o.y) < o.r) return true; return false; }
  function canSee(ax, ay, bx, by) { const steps = 10; for (let i = 1; i < steps; i++) { const t = i / steps; if (bulletBlocked(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; } return true; }

  function fire(from, ang, gun, isPlayer) {
    const pellets = gun.pellets || 1;
    for (let p = 0; p < pellets; p++) { const a = ang + rand(-gun.spread, gun.spread); bullets.push({ x: from.x, y: from.y, vx: Math.cos(a) * gun.speed, vy: Math.sin(a) * gun.speed, dmg: isPlayer ? gun.dmg : gun.dmg * 0.6, life: gun.range / gun.speed + 0.1, player: isPlayer, color: gun.color }); }
    particles.push({ x: from.x + Math.cos(ang) * 14, y: from.y + Math.sin(ang) * 14, t: 0.07, flash: true });
  }
  function reloadGun(g) { if (g && !g.melee && g.reloading <= 0 && g.ammo < g.mag) g.reloading = g.reload; }
  function switchTo(i) { if (player.slots[i]) { player.cur = i; player.cd = 0.15; } }
  function cycle() { for (let k = 1; k <= 3; k++) { const i = (player.cur + k) % 3; if (player.slots[i]) { switchTo(i); return; } } }
  function pickup(gunKey) { for (let i = 0; i < 3; i++) if (!player.slots[i]) { player.slots[i] = mkGun(gunKey); player.cur = i; pop("Picked up " + GUNS[gunKey].name, GUNS[gunKey].color); return; } player.slots[player.cur] = mkGun(gunKey); pop("Swapped to " + GUNS[gunKey].name, GUNS[gunKey].color); }

  function hurtPlayer(dmg) { if (player.shield > 0) { const s = Math.min(player.shield, dmg); player.shield -= s; dmg -= s; } player.hp -= dmg; blood(player.x, player.y, "#ffd166"); }
  function killBot(b) { b.dead = true; kills++; pop("Eliminated!", "#7ee787"); if (Math.random() < 0.7) loot.push({ x: b.x, y: b.y, kind: Math.random() < 0.5 ? "shield" : "gun", gun: GK[1 + ((Math.random() * (GK.length - 1)) | 0)] }); }
  function meleeSwing(g) { const ca = Math.cos(player.aim), sa = Math.sin(player.aim); bots.forEach((b) => { if (b.hp <= 0) return; const dx = b.x - player.x, dy = b.y - player.y, d = Math.hypot(dx, dy); if (d < g.range + b.r) { const dot = (dx / (d || 1)) * ca + (dy / (d || 1)) * sa; if (dot > 0.1 || d < b.r + 16) { b.hp -= g.dmg; blood(b.x, b.y, "#ff6b6b"); if (b.state === "roam") { b.state = "engage"; b.reactT = rand(0.2, 0.5); } if (b.hp <= 0) killBot(b); } } }); }

  function update(dt) {
    if (over) { if (pressed.Space || mouse.clicked) reset(); return; }
    if (pressed.KeyM || pressed.Tab) showMap = !showMap;
    if (showMap) { if (mouse.clicked || pressed.Escape) showMap = false; env.setHud("MAP — press M to close"); return; }

    const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
    player.aim = Math.atan2(wy - player.y, wx - player.x);
    if (pressed.Digit1) switchTo(0);
    if (pressed.Digit2) switchTo(1);
    if (pressed.Digit3) switchTo(2);
    if (pressed.KeyQ) cycle();
    if (pressed.KeyR) reloadGun(curGun());

    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    const l = Math.hypot(mx, my) || 1;
    const nx = clamp(player.x + (mx / l) * player.spd * dt, 20, MAP_W - 20), ny = clamp(player.y + (my / l) * player.spd * dt, 20, MAP_H - 20);
    if (passMove(nx, player.y)) player.x = nx;
    if (passMove(player.x, ny)) player.y = ny;
    if (mx || my) player.walk = (player.walk || 0) + dt; else player.walk = 0;

    const g = curGun();
    player.cd = Math.max(0, player.cd - dt); player.swing = Math.max(0, player.swing - dt);
    if (!g.melee && g.reloading > 0) { g.reloading -= dt; if (g.reloading <= 0) g.ammo = g.mag; }
    if ((mouse.down || keys.Space) && player.cd <= 0) {
      if (g.melee) { meleeSwing(g); player.cd = g.rate; player.swing = 0.14; }
      else if (g.reloading <= 0 && g.ammo > 0) { fire(player, player.aim, g, true); g.ammo--; player.cd = g.rate; if (g.ammo === 0) reloadGun(g); }
    }

    loot = loot.filter((it) => { if (dist(it.x, it.y, player.x, player.y) < 26) { if (it.kind === "shield") { player.shield = Math.min(100, player.shield + 50); pop("+50 shield", "#79c0ff"); } else pickup(it.gun); return false; } return true; });

    if (storm.r > storm.target) storm.r = Math.max(storm.target, storm.r - storm.shrink * dt);
    if (dist(player.x, player.y, storm.cx, storm.cy) > storm.r) player.hp -= 11 * dt;

    updateBots(dt);
    bullets.forEach((bu) => {
      bu.x += bu.vx * dt; bu.y += bu.vy * dt; bu.life -= dt;
      if (bulletBlocked(bu.x, bu.y)) { bu.life = 0; return; }
      if (bu.player) { bots.forEach((b) => { if (b.hp > 0 && dist(bu.x, bu.y, b.x, b.y) < b.r + 3) { b.hp -= bu.dmg; bu.life = 0; blood(b.x, b.y, "#ff6b6b"); if (b.state === "roam") { b.state = "engage"; b.reactT = rand(0.2, 0.5); } if (b.hp <= 0) killBot(b); } }); }
      else if (dist(bu.x, bu.y, player.x, player.y) < player.r + 3) { bu.life = 0; hurtPlayer(bu.dmg); }
    });
    bullets = bullets.filter((b) => b.life > 0);
    bots = bots.filter((b) => !b.dead && b.hp > 0);
    alive = bots.length + (player.hp > 0 ? 1 : 0);
    particles.forEach((p) => { p.t -= dt; if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; } });
    particles = particles.filter((p) => p.t > 0);
    if (player.hp <= 0) over = "lose"; else if (bots.length === 0) over = "win";
    cam.x = clamp(player.x - W / 2, 0, MAP_W - W); cam.y = clamp(player.y - H / 2, 0, MAP_H - H);
    const slots = player.slots.map((s, i) => (s ? `${i + 1}:${s.name}` : `${i + 1}:—`) + (i === player.cur ? "*" : "")).join(" ");
    const ammo = g.melee ? "fists/melee" : g.reloading > 0 ? "RELOAD" : `${g.ammo}/${g.mag}`;
    env.setHud(`HP ${Math.max(0, player.hp | 0)} 🛡${player.shield | 0} [${ammo}] ${slots} K${kills} Alive ${alive}`);
  }

  function updateBots(dt) {
    bots.forEach((b) => {
      const d = dist(b.x, b.y, player.x, player.y);
      if (b.lootT != null) { b.lootT -= dt; if (b.lootT <= 0) { b.gun = mkGun(GK[1 + ((Math.random() * (GK.length - 1)) | 0)]); b.lootT = null; } }
      const g = botGun(b);
      if (!g.melee && g.reloading > 0) { g.reloading -= dt; if (g.reloading <= 0) g.ammo = g.mag; }
      b.fireCd = Math.max(0, b.fireCd - dt);
      const inStorm = dist(b.x, b.y, storm.cx, storm.cy) < storm.r - 30;
      const sight = 340 + b.skill * 120; const sees = d < sight && canSee(b.x, b.y, player.x, player.y);
      if (b.hp < 32 && b.state !== "flee") b.state = "flee";
      if (b.state === "roam" && sees) { b.state = "engage"; b.reactT = rand(0.35, 0.95) * (1.4 - b.skill); }
      if (b.state === "engage") { if (sees) b.lostT = 0; else { b.lostT += dt; if (b.lostT > 1.4) b.state = "roam"; } }
      if (b.state === "flee" && b.hp >= 32 && !sees) b.state = "roam";
      let tx, ty, moveSpd = b.spd;
      if (!inStorm) { tx = storm.cx; ty = storm.cy; }
      else if (b.state === "roam") { b.wanderT -= dt; if (b.wanderT <= 0) { b.wanderA = rand(0, 6.28); b.wanderT = rand(1, 2.5); } tx = b.x + Math.cos(b.wanderA) * 120; ty = b.y + Math.sin(b.wanderA) * 120; moveSpd = b.spd * 0.6; }
      else if (b.state === "flee") { const a = Math.atan2(b.y - player.y, b.x - player.x); tx = b.x + Math.cos(a) * 120; ty = b.y + Math.sin(a) * 120; }
      else { const pref = g.melee ? 18 : clamp(g.range * 0.7, 120, 320); const a = Math.atan2(player.y - b.y, player.x - b.x); b.strafeT -= dt; if (b.strafeT <= 0) { b.strafe *= -1; b.strafeT = rand(0.7, 1.8); } let radial = 0; if (d > pref + 40) radial = 1; else if (d < pref - 40) radial = -1; const pa = a + Math.PI / 2 * b.strafe; tx = b.x + Math.cos(a) * radial * 100 + Math.cos(pa) * 70; ty = b.y + Math.sin(a) * radial * 100 + Math.sin(pa) * 70; }
      const ma = Math.atan2(ty - b.y, tx - b.x); const bnx = b.x + Math.cos(ma) * moveSpd * dt, bny = b.y + Math.sin(ma) * moveSpd * dt;
      if (passMove(bnx, b.y)) b.x = bnx; if (passMove(b.x, bny)) b.y = bny;
      if (!inStorm) b.hp -= 11 * dt;
      b.walk = (b.walk || 0) + dt;
      if (b.state === "engage" || (b.state === "flee" && Math.random() < 0.4)) {
        if (b.reactT > 0) b.reactT -= dt;
        else if (g.melee) { if (d < b.r + player.r + 6 && b.fireCd <= 0) { hurtPlayer(g.dmg * 0.6); b.fireCd = 0.8; } }
        else if (sees && d < g.range * 1.1 && g.reloading <= 0 && b.fireCd <= 0) { if (g.ammo > 0) { const err = (1 - b.skill) * 0.22 + (d / 1600); const aim = Math.atan2(player.y - b.y, player.x - b.x) + rand(-err, err); fire(b, aim, g, false); g.ammo--; b.fireCd = g.rate * rand(1.6, 3.0); if (g.ammo === 0) g.reloading = g.reload; } else g.reloading = g.reload; }
      }
    });
  }
  function pop(str, color) { particles.push({ x: player.x, y: player.y - 26, str, color, t: 1.1, vy: -24, vx: 0, kind: "txt" }); }
  function blood(x, y, c) { for (let i = 0; i < 6; i++) particles.push({ x, y, vx: rand(-70, 70), vy: rand(-70, 70), t: .3, color: c }); }

  function drawFighter(x, y, aim, isPlayer, walk, hurt, hasGun) {
    const pal = isPlayer
      ? { skin: "#e0a878", skinSh: "#c07a4a", hair: "#3a2a1a", role: "generic", cloth: "#4a7fb5", clothHi: "#6aa0d0", clothSh: "#345f85", pants: "#2f3d52", pantsSh: "#22303f", boot: "#2a2320" }
      : { skin: "#d99a68", skinSh: "#b87848", hair: "#2a1a12", role: "generic", cloth: hurt ? "#c98a4a" : "#b0484a", clothHi: "#c96a6c", clothSh: "#7a2f31", pants: "#3a2a2a", pantsSh: "#281c1c", boot: "#2a2320" };
    drawHumanoid(ctx, x, y, Math.cos(aim) >= 0 ? 1 : -1, pal, 2.3, walk, {});
    if (hasGun) { ctx.save(); ctx.translate(x, y - 2); ctx.rotate(aim); ctx.fillStyle = "#222"; ctx.fillRect(6, -2, 16, 4); ctx.restore(); }
  }
  function drawStructure(p, x, y) {
    if (p.kind === "light") { ctx.fillStyle = "#c9c2b0"; ctx.fillRect(x - 8, y - 40, 16, 40); ctx.fillStyle = "#c0504a"; ctx.fillRect(x - 8, y - 40, 16, 8); ctx.fillStyle = "#ffe36b"; ctx.fillRect(x - 5, y - 30, 10, 8); }
    else if (p.kind === "village" || p.kind === "camp") { ctx.fillStyle = "#8a5a32"; ctx.fillRect(x - 16, y - 14, 32, 14); ctx.fillStyle = "#5a3a22"; ctx.beginPath(); ctx.moveTo(x - 20, y - 14); ctx.lineTo(x, y - 28); ctx.lineTo(x + 20, y - 14); ctx.fill(); }
    else if (p.kind === "fort" || p.kind === "tower") { ctx.fillStyle = "#8a8f95"; ctx.fillRect(x - 18, y - 30, 36, 30); ctx.fillStyle = "#6a6f75"; for (let i = -18; i < 18; i += 8) ctx.fillRect(x + i, y - 36, 5, 6); }
    else if (p.kind === "ruins") { ctx.fillStyle = "#9aa0a6"; ctx.fillRect(x - 16, y - 8, 5, 8); ctx.fillRect(x - 4, y - 20, 5, 20); ctx.fillRect(x + 10, y - 14, 5, 14); }
    else if (p.kind === "wreck") { ctx.fillStyle = "#6a4a2a"; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.2); ctx.fillRect(-22, -8, 44, 14); ctx.fillStyle = "#8a6a3a"; ctx.fillRect(-2, -28, 4, 22); ctx.restore(); }
    else if (p.kind === "cave") { ctx.fillStyle = "#4a4640"; ctx.beginPath(); ctx.arc(x, y, 16, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#151310"; ctx.beginPath(); ctx.arc(x, y, 9, Math.PI, 0); ctx.fill(); }
    text(ctx, p.name, x, y - 52, 12, "#ffe0a0", "center");
  }

  function render() {
    if (showMap) return renderMap();
    const TS = 32, ox = Math.floor(cam.x / TS) * TS, oy = Math.floor(cam.y / TS) * TS;
    for (let wy = oy; wy < cam.y + H + TS; wy += TS) for (let wx = ox; wx < cam.x + W + TS; wx += TS) { const b = isl.biome(wx + 16, wy + 16); ctx.fillStyle = biomeColor(b, hash((wx / TS) | 0, (wy / TS) | 0)); ctx.fillRect(wx - cam.x, wy - cam.y, TS + 1, TS + 1); }
    // POIs
    pois.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return; drawStructure(p, x, y); });
    // loot
    loot.forEach((it) => { const x = it.x - cam.x, y = it.y - cam.y; if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return; if (it.kind === "shield") rectFill(ctx, x - 7, y - 7, 14, 14, "#79c0ff"); else { rectFill(ctx, x - 9, y - 4, 18, 8, GUNS[it.gun].color); rectFill(ctx, x - 9, y - 4, 4, 8, "#333"); } });
    // obstacles
    obst.forEach((o) => { const x = o.x - cam.x, y = o.y - cam.y; if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return; if (o.t === "tree") { ctx.fillStyle = "#4a3320"; ctx.fillRect(x - 3, y, 6, 12); ctx.fillStyle = "#2e6a3a"; ctx.beginPath(); ctx.arc(x, y - 4, o.r, 0, 7); ctx.fill(); ctx.fillStyle = "#3f8a4e"; ctx.beginPath(); ctx.arc(x - 4, y - 8, o.r * 0.5, 0, 7); ctx.fill(); } else { ctx.fillStyle = "#6b6660"; ctx.beginPath(); ctx.arc(x, y, o.r, 0, 7); ctx.fill(); ctx.fillStyle = "#8a857c"; ctx.beginPath(); ctx.arc(x - 4, y - 4, o.r * 0.5, 0, 7); ctx.fill(); } });
    // bots
    bots.forEach((b) => { const x = b.x - cam.x, y = b.y - cam.y; if (x < -30 || x > W + 30 || y < -40 || y > H + 30) return; drawFighter(x, y, Math.atan2(player.y - b.y, player.x - b.x), false, b.walk, b.state === "flee", !botGun(b).melee); rectFill(ctx, x - 12, y - 30, 24, 4, "#400"); rectFill(ctx, x - 12, y - 30, 24 * clamp(b.hp / 100, 0, 1), 4, "#ff6b6b"); if (b.state === "engage" && b.reactT > 0) text(ctx, "!", x, y - 44, 20, "#ffd166", "center"); });
    // bullets
    bullets.forEach((bu) => rectFill(ctx, bu.x - cam.x - 2, bu.y - cam.y - 2, 4, 4, bu.color || "#fff"));
    // player
    const ppx = player.x - cam.x, ppy = player.y - cam.y;
    if (player.swing > 0) { ctx.fillStyle = "rgba(255,240,150,.5)"; ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.arc(ppx, ppy, curGun().range + 6, player.aim - 0.9, player.aim + 0.9); ctx.closePath(); ctx.fill(); }
    drawFighter(ppx, ppy, player.aim, true, player.walk, false, !curGun().melee);
    // particles
    particles.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; if (p.kind === "txt") text(ctx, p.str, x, y, 14, p.color, "center"); else if (p.flash) rectFill(ctx, x - 3, y - 3, 6, 6, "#fff7c0"); else rectFill(ctx, x - 2, y - 2, 4, 4, p.color); });
    // storm ring
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(storm.cx - cam.x, storm.cy - cam.y, storm.r, 0, 7, true); ctx.fillStyle = "rgba(140,90,200,0.26)"; ctx.fill("evenodd"); ctx.restore();
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(storm.cx - cam.x, storm.cy - cam.y, storm.r, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
    // crosshair + hotbar + minimap
    rectFill(ctx, mouse.x - 8, mouse.y - 1, 16, 2, "#fff"); rectFill(ctx, mouse.x - 1, mouse.y - 8, 2, 16, "#fff");
    drawHotbar(); drawMini();
    if (over) { ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(0, 0, W, H); if (over === "win") { text(ctx, "#1 VICTORY ROYALE!", W / 2, H / 2 - 40, 38, "#ffd166", "center"); text(ctx, `${kills} eliminations`, W / 2, H / 2 + 6, 18, "#fff", "center"); } else { text(ctx, "KNOCKED OUT", W / 2, H / 2 - 40, 42, "#ff4d4d", "center"); text(ctx, `${kills} eliminations · placed #${alive + 1}`, W / 2, H / 2 + 6, 18, "#fff", "center"); } text(ctx, "Press SPACE / Click to drop again", W / 2, H / 2 + 42, 15, "#8b949e", "center"); }
  }

  function drawHotbar() {
    const bw = 66, gap = 6, tot = 3 * (bw + gap) - gap, sx = W / 2 - tot / 2, y = H - 46;
    for (let i = 0; i < 3; i++) { const x = sx + i * (bw + gap); rectFill(ctx, x, y, bw, 40, i === player.cur ? "#1f3f5a" : "#0d1117cc"); ctx.strokeStyle = i === player.cur ? "#79c0ff" : "#30363d"; ctx.strokeRect(x, y, bw, 40); text(ctx, "" + (i + 1), x + 3, y + 2, 11, "#8b949e", "left"); const s = player.slots[i]; if (s) { rectFill(ctx, x + 10, y + 20, 30, 7, s.color); text(ctx, s.name, x + bw / 2, y + 6, 10, "#fff", "center"); if (!s.melee) text(ctx, `${s.ammo}/${s.mag}`, x + bw / 2, y + 28, 10, "#c9d1d9", "center"); } else text(ctx, "empty", x + bw / 2, y + 15, 11, "#586069", "center"); }
    const cg = curGun(); if (cg === FIST) text(ctx, "FISTS (find a weapon!)", W / 2, y - 16, 12, "#ffd166", "center");
    rectFill(ctx, sx, y - 8, tot * clamp(player.shield / 100, 0, 1), 4, "#79c0ff");
  }
  function drawMini() {
    const mm = 120, mx = W - mm - 12, my = 12; ctx.fillStyle = "#0d1117cc"; ctx.fillRect(mx - 2, my - 2, mm + 4, mm + 4);
    for (let y = 0; y < mm; y += 3) for (let x = 0; x < mm; x += 3) { const b = isl.biome(x / mm * MAP_W, y / mm * MAP_H); ctx.fillStyle = biomeColor(b, 0.5); ctx.fillRect(mx + x, my + y, 3, 3); }
    // storm on mini
    ctx.strokeStyle = "#c084fc"; ctx.beginPath(); ctx.arc(mx + storm.cx / MAP_W * mm, my + storm.cy / MAP_H * mm, storm.r / MAP_W * mm, 0, 7); ctx.stroke();
    pois.forEach((p) => { ctx.fillStyle = "#ffd166"; ctx.fillRect(mx + p.x / MAP_W * mm - 1, my + p.y / MAP_H * mm - 1, 2, 2); });
    ctx.fillStyle = "#7ee787"; ctx.fillRect(mx + player.x / MAP_W * mm - 1, my + player.y / MAP_H * mm - 1, 3, 3);
    ctx.strokeStyle = "#30363d"; ctx.strokeRect(mx, my, mm, mm); text(ctx, "M: map", mx, my + mm + 2, 10, "#8b949e", "left");
  }
  function renderMap() {
    rectFill(ctx, 0, 0, W, H, "#0a0d12");
    text(ctx, "ISLAND MAP — press M to close", W / 2, 20, 16, "#ffd166", "center");
    const mw = 460, mh = 460, mx = W / 2 - mw / 2, my = 60, sx = mw / MAP_W, sy = mh / MAP_H;
    for (let y = 0; y < mh; y += 2) for (let x = 0; x < mw; x += 2) { const b = isl.biome(x / sx, y / sy); ctx.fillStyle = biomeColor(b, hash(x, y)); ctx.fillRect(mx + x, my + y, 2, 2); }
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx + storm.cx * sx, my + storm.cy * sy, storm.r * sx, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
    pois.forEach((p) => { const x = mx + p.x * sx, y = my + p.y * sy; rectFill(ctx, x - 3, y - 3, 6, 6, "#ffd166"); text(ctx, p.name, x + 7, y - 6, 11, "#e6edf3", "left"); });
    ctx.fillStyle = "#7ee787"; ctx.fillRect(mx + player.x * sx - 3, my + player.y * sy - 3, 6, 6); text(ctx, "YOU", mx + player.x * sx + 8, my + player.y * sy - 6, 11, "#7ee787", "left");
    ctx.strokeStyle = "#30363d"; ctx.strokeRect(mx, my, mw, mh);
  }

  Arcade.games.fortnite = { title: "BATTLE DROP", start, update, render, stop() {} };
})();
