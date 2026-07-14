/* ============================================================
   GAME 2 — BATTLE DROP  (2D battle royale)
   Loot weapons/shields off the ground, mouse-aim & shoot bots,
   survive the shrinking storm. Last one standing wins.
   ============================================================ */
(function () {
  const { rand, clamp, dist, rectFill, text } = Arcade;
  const W = 960, H = 600;
  const MAP_W = 2200, MAP_H = 1600;

  const GUNS = {
    pistol: { name: "Pistol", dmg: 18, rate: 0.42, spread: 0.05, speed: 620, mag: 12, color: "#8b949e" },
    smg:    { name: "SMG",    dmg: 11, rate: 0.11, spread: 0.14, speed: 640, mag: 30, color: "#79c0ff" },
    rifle:  { name: "Rifle",  dmg: 30, rate: 0.5,  spread: 0.03, speed: 820, mag: 20, color: "#a371f7" },
    shotgun:{ name: "Shotgun",dmg: 9,  rate: 0.75, spread: 0.28, speed: 560, mag: 6,  pellets: 7, color: "#ff7b4a" },
  };

  let ctx, env, keys, pressed, mouse;
  let player, cam, bots, bullets, loot, walls, particles, storm, over, kills, alive;

  function reset() {
    player = { x: MAP_W / 2, y: MAP_H / 2, r: 13, spd: 230, hp: 100, shield: 0,
      gun: { ...GUNS.pistol, ammo: GUNS.pistol.mag }, cd: 0, aim: 0 };
    cam = { x: 0, y: 0 };
    bots = []; bullets = []; loot = []; particles = []; walls = [];
    over = null; kills = 0;

    // walls / crates
    for (let i = 0; i < 34; i++) walls.push({ x: rand(80, MAP_W - 160), y: rand(80, MAP_H - 160), w: rand(50, 120), h: rand(50, 120) });

    // loot on ground
    const keysG = Object.keys(GUNS);
    for (let i = 0; i < 22; i++) loot.push({ x: rand(60, MAP_W - 60), y: rand(60, MAP_H - 60), kind: "gun", gun: keysG[(Math.random() * keysG.length) | 0] });
    for (let i = 0; i < 14; i++) loot.push({ x: rand(60, MAP_W - 60), y: rand(60, MAP_H - 60), kind: "shield" });

    // bots
    for (let i = 0; i < 15; i++) spawnBot();
    alive = bots.length + 1;

    storm = { cx: MAP_W / 2, cy: MAP_H / 2, r: Math.hypot(MAP_W, MAP_H) / 2, target: 260, shrink: 22 };
  }

  function spawnBot() {
    let x, y, t = 0;
    do { x = rand(60, MAP_W - 60); y = rand(60, MAP_H - 60); t++; }
    while (dist(x, y, MAP_W / 2, MAP_H / 2) < 260 && t < 20);
    const gnames = Object.keys(GUNS);
    const g = GUNS[gnames[(Math.random() * gnames.length) | 0]];
    bots.push({ x, y, r: 13, hp: 60, spd: rand(80, 130), cd: rand(0, 1), gun: g, dir: rand(0, 6.28), repick: 0 });
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    reset();
    env.setControls("<b>WASD</b> move · <b>Mouse</b> aim · <b>Click / hold</b> shoot · walk over loot to grab · <b>ESC</b> menu");
    env.hideOverlay();
  }

  function fire(from, tx, ty, gun, isPlayer) {
    const ang = Math.atan2(ty - from.y, tx - from.x);
    const pellets = gun.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const a = ang + rand(-gun.spread, gun.spread);
      bullets.push({ x: from.x, y: from.y, vx: Math.cos(a) * gun.speed, vy: Math.sin(a) * gun.speed,
        dmg: gun.dmg, life: 1.1, player: isPlayer, color: gun.color });
    }
    particles.push({ x: from.x + Math.cos(ang) * 14, y: from.y + Math.sin(ang) * 14, t: 0.08, flash: true });
  }

  function hurtWall(x, y) {
    for (const w of walls) if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
    return false;
  }

  function update(dt) {
    if (over) { if (pressed.Space || mouse.clicked) reset(); return; }

    const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
    player.aim = Math.atan2(wy - player.y, wx - player.x);

    // move
    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    const l = Math.hypot(mx, my) || 1;
    const nx = clamp(player.x + (mx / l) * player.spd * dt, 20, MAP_W - 20);
    const ny = clamp(player.y + (my / l) * player.spd * dt, 20, MAP_H - 20);
    if (!hurtWall(nx, player.y)) player.x = nx;
    if (!hurtWall(player.x, ny)) player.y = ny;

    // shoot
    player.cd = Math.max(0, player.cd - dt);
    if ((mouse.down || keys.Space) && player.cd <= 0 && player.gun.ammo > 0) {
      fire(player, wx, wy, player.gun, true);
      player.cd = player.gun.rate; player.gun.ammo--;
    }
    if (player.gun.ammo <= 0) player.gun.ammo = player.gun.mag; // auto-reload for arcade feel

    // loot pickup
    loot = loot.filter((it) => {
      if (dist(it.x, it.y, player.x, player.y) < 24) {
        if (it.kind === "shield") { player.shield = Math.min(100, player.shield + 50); pop("+50 shield", "#79c0ff"); }
        else { player.gun = { ...GUNS[it.gun], ammo: GUNS[it.gun].mag }; pop("Picked up " + GUNS[it.gun].name, GUNS[it.gun].color); }
        return false;
      }
      return true;
    });

    // storm
    if (storm.r > storm.target) storm.r = Math.max(storm.target, storm.r - storm.shrink * dt);
    const outOfStorm = dist(player.x, player.y, storm.cx, storm.cy) > storm.r;
    if (outOfStorm) { player.hp -= 12 * dt; }

    // bots AI
    bots.forEach((b) => {
      b.repick -= dt;
      const d = dist(b.x, b.y, player.x, player.y);
      // move toward storm center if outside, else strafe/approach player
      const inStorm = dist(b.x, b.y, storm.cx, storm.cy) < storm.r - 30;
      let tx, ty;
      if (!inStorm) { tx = storm.cx; ty = storm.cy; }
      else if (d < 420) { tx = player.x; ty = player.y; }
      else { if (b.repick <= 0) { b.dir = rand(0, 6.28); b.repick = rand(1, 2.5); } tx = b.x + Math.cos(b.dir) * 100; ty = b.y + Math.sin(b.dir) * 100; }
      const a = Math.atan2(ty - b.y, tx - b.x);
      const bnx = b.x + Math.cos(a) * b.spd * dt, bny = b.y + Math.sin(a) * b.spd * dt;
      if (!hurtWall(bnx, bny)) { b.x = bnx; b.y = bny; }
      if (!inStorm) b.hp -= 12 * dt;
      // shoot player
      b.cd -= dt;
      if (d < 380 && b.cd <= 0) { fire(b, player.x + rand(-30, 30), player.y + rand(-30, 30), b.gun, false); b.cd = b.gun.rate * 2.2; }
    });

    // bullets
    bullets.forEach((bu) => {
      bu.x += bu.vx * dt; bu.y += bu.vy * dt; bu.life -= dt;
      if (hurtWall(bu.x, bu.y)) { bu.life = 0; return; }
      if (bu.player) {
        bots.forEach((b) => { if (b.hp > 0 && dist(bu.x, bu.y, b.x, b.y) < b.r + 3) {
          b.hp -= bu.dmg; bu.life = 0; blood(b.x, b.y, "#ff6b6b");
          if (b.hp <= 0) { b.dead = true; kills++; pop("Eliminated!", "#7ee787"); if (Math.random() < 0.6) loot.push({ x: b.x, y: b.y, kind: Math.random() < 0.5 ? "shield" : "gun", gun: "smg" }); }
        }});
      } else {
        if (dist(bu.x, bu.y, player.x, player.y) < player.r + 3) {
          bu.life = 0; let dmg = bu.dmg;
          if (player.shield > 0) { const s = Math.min(player.shield, dmg); player.shield -= s; dmg -= s; }
          player.hp -= dmg; blood(player.x, player.y, "#ffd166");
        }
      }
    });
    bullets = bullets.filter((b) => b.life > 0);
    bots = bots.filter((b) => !b.dead);
    alive = bots.length + (player.hp > 0 ? 1 : 0);

    particles.forEach((p) => { p.t -= dt; if (p.vx) { p.x += p.vx * dt; p.y += p.vy * dt; } });
    particles = particles.filter((p) => p.t > 0);

    if (player.hp <= 0) over = "lose";
    else if (bots.length === 0) over = "win";

    cam.x = clamp(player.x - W / 2, 0, MAP_W - W);
    cam.y = clamp(player.y - H / 2, 0, MAP_H - H);
    env.setHud(`HP ${Math.max(0, player.hp | 0)}  🛡${player.shield | 0}  ${player.gun.name} ${player.gun.ammo}/${player.gun.mag}  Kills ${kills}  Alive ${alive}`);
  }

  function pop(str, color) { particles.push({ x: player.x, y: player.y - 26, str, color, t: 1.1, vy: -24, vx: 0, kind: "txt" }); }
  function blood(x, y, c) { for (let i = 0; i < 6; i++) particles.push({ x, y, vx: rand(-70, 70), vy: rand(-70, 70), t: .3, color: c }); }

  function render() {
    rectFill(ctx, 0, 0, W, H, "#3a4a2e");
    // ground texture
    const ts = 48, sx = Math.floor(cam.x / ts) * ts, sy = Math.floor(cam.y / ts) * ts;
    for (let x = sx; x < cam.x + W; x += ts)
      for (let y = sy; y < cam.y + H; y += ts)
        if (((x / ts) + (y / ts)) % 2 === 0) rectFill(ctx, x - cam.x, y - cam.y, ts, ts, "#43552f");

    // walls
    walls.forEach((w) => {
      rectFill(ctx, w.x - cam.x, w.y - cam.y, w.w, w.h, "#6b7280");
      rectFill(ctx, w.x - cam.x, w.y - cam.y, w.w, 6, "#8a94a3");
      ctx.strokeStyle = "#3a3f47"; ctx.strokeRect(w.x - cam.x, w.y - cam.y, w.w, w.h);
    });

    // loot
    loot.forEach((it) => {
      const x = it.x - cam.x, y = it.y - cam.y;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
      if (it.kind === "shield") { rectFill(ctx, x - 7, y - 7, 14, 14, "#79c0ff"); text(ctx, "🛡", x, y - 9, 13, "#fff", "center"); }
      else { rectFill(ctx, x - 8, y - 4, 16, 8, GUNS[it.gun].color); rectFill(ctx, x - 8, y - 4, 4, 8, "#333"); }
    });

    // bots
    bots.forEach((b) => {
      const x = b.x - cam.x, y = b.y - cam.y;
      rectFill(ctx, x - b.r, y - b.r, b.r * 2, b.r * 2, "#c94f4f");
      rectFill(ctx, x - b.r, y - b.r - 8, b.r * 2, 4, "#400");
      rectFill(ctx, x - b.r, y - b.r - 8, b.r * 2 * clamp(b.hp / 60, 0, 1), 4, "#ff6b6b");
    });

    // bullets
    bullets.forEach((bu) => rectFill(ctx, bu.x - cam.x - 2, bu.y - cam.y - 2, 4, 4, bu.color || "#fff"));

    // player
    const px = player.x - cam.x, py = player.y - cam.y;
    rectFill(ctx, px - player.r, py - player.r, player.r * 2, player.r * 2, "#79c0ff");
    // gun barrel
    ctx.save(); ctx.translate(px, py); ctx.rotate(player.aim);
    rectFill(ctx, 6, -3, 20, 6, "#222"); ctx.restore();

    // particles
    particles.forEach((p) => {
      const x = p.x - cam.x, y = p.y - cam.y;
      if (p.kind === "txt") text(ctx, p.str, x, y, 14, p.color, "center");
      else if (p.flash) rectFill(ctx, x - 3, y - 3, 6, 6, "#fff7c0");
      else rectFill(ctx, x - 2, y - 2, 4, 4, p.color);
    });

    // storm (draw outside-circle overlay)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(storm.cx - cam.x, storm.cy - cam.y, storm.r, 0, 7, true);
    ctx.fillStyle = "rgba(140,90,200,0.28)"; ctx.fill("evenodd");
    ctx.restore();
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(storm.cx - cam.x, storm.cy - cam.y, storm.r, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;

    // crosshair
    rectFill(ctx, mouse.x - 8, mouse.y - 1, 16, 2, "#fff");
    rectFill(ctx, mouse.x - 1, mouse.y - 8, 2, 16, "#fff");

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(0, 0, W, H);
      if (over === "win") { text(ctx, "#1 VICTORY ROYALE!", W / 2, H / 2 - 40, 38, "#ffd166", "center"); text(ctx, `${kills} eliminations`, W / 2, H / 2 + 6, 18, "#fff", "center"); }
      else { text(ctx, "KNOCKED OUT", W / 2, H / 2 - 40, 42, "#ff4d4d", "center"); text(ctx, `${kills} eliminations · #${alive + 1}`, W / 2, H / 2 + 6, 18, "#fff", "center"); }
      text(ctx, "Press SPACE / Click to drop again", W / 2, H / 2 + 42, 15, "#8b949e", "center");
    }
  }

  Arcade.games.fortnite = { title: "BATTLE DROP", start, update, render, stop() {} };
})();
