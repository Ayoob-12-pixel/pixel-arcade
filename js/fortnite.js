/* ============================================================
   GAME 2 — BATTLE DROP  (2D battle royale)
   Carry up to 3 weapons and switch between them (1/2/3 or Q).
   Bots behave like players: they patrol, take a moment to react
   when they spot you, miss, keep their distance, reload, and
   flee when wounded — they won't instantly delete you.
   Survive the shrinking storm to win.
   ============================================================ */
(function () {
  const { rand, clamp, dist, rectFill, text } = Arcade;
  const W = 960, H = 600;
  const MAP_W = 3600, MAP_H = 2600;

  const GUNS = {
    pickaxe: { name: "Pickaxe", melee: true, dmg: 34, rate: 0.42, range: 42, color: "#b98a5a" },
    pistol:  { name: "Pistol",  dmg: 20, rate: 0.40, spread: 0.05, speed: 640, mag: 12, reload: 1.1, range: 300, color: "#8b949e" },
    smg:     { name: "SMG",     dmg: 12, rate: 0.10, spread: 0.13, speed: 660, mag: 30, reload: 1.4, range: 260, color: "#79c0ff" },
    rifle:   { name: "Rifle",   dmg: 32, rate: 0.48, spread: 0.03, speed: 840, mag: 20, reload: 1.8, range: 460, color: "#a371f7" },
    shotgun: { name: "Shotgun", dmg: 8,  rate: 0.72, spread: 0.26, speed: 560, mag: 6,  reload: 1.9, range: 170, pellets: 8, color: "#ff7b4a" },
    sniper:  { name: "Sniper",  dmg: 80, rate: 1.25, spread: 0.005, speed: 1100, mag: 5, reload: 2.4, range: 700, color: "#ffd166" },
  };
  const GK = Object.keys(GUNS).filter((k) => k !== "pickaxe"); // lootable guns (no pickaxe drops)

  let ctx, env, keys, pressed, mouse;
  let player, cam, bots, bullets, loot, walls, particles, storm, over, kills, alive;

  function mkGun(key) { return { key, ...GUNS[key], ammo: GUNS[key].mag, reloading: 0 }; }

  function reset() {
    // you drop in with NOTHING but a pickaxe — you must loot guns off the ground / off kills
    player = { x: MAP_W / 2, y: MAP_H / 2, r: 13, spd: 235, hp: 100, shield: 0, aim: 0,
      slots: [mkGun("pickaxe"), null, null], cur: 0, cd: 0, swing: 0 };
    cam = { x: 0, y: 0 }; bots = []; bullets = []; loot = []; particles = []; walls = [];
    over = null; kills = 0;

    for (let i = 0; i < 60; i++) walls.push({ x: rand(80, MAP_W - 180), y: rand(80, MAP_H - 180), w: rand(50, 130), h: rand(50, 130) });
    for (let i = 0; i < 44; i++) loot.push({ x: rand(60, MAP_W - 60), y: rand(60, MAP_H - 60), kind: "gun", gun: GK[(Math.random() * GK.length) | 0] });
    for (let i = 0; i < 26; i++) loot.push({ x: rand(60, MAP_W - 60), y: rand(60, MAP_H - 60), kind: "shield" });

    for (let i = 0; i < 24; i++) spawnBot();
    alive = bots.length + 1;
    storm = { cx: MAP_W / 2, cy: MAP_H / 2, r: Math.hypot(MAP_W, MAP_H) / 2, target: 260, shrink: 24 };
  }

  function spawnBot() {
    let x, y, t = 0;
    do { x = rand(60, MAP_W - 60); y = rand(60, MAP_H - 60); t++; } while (dist(x, y, MAP_W / 2, MAP_H / 2) < 300 && t < 20);
    bots.push({
      x, y, r: 13, hp: 100, spd: rand(150, 200), gun: mkGun("pickaxe"), lootT: rand(3, 14),
      state: "roam", reactT: 0, fireCd: rand(0, 1), strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rand(0.6, 1.6),
      skill: rand(0.35, 0.8), wanderA: rand(0, 6.28), wanderT: 0, lostT: 0, name: "Bot",
    });
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse; reset();
    env.setControls("You start with a <b>PICKAXE</b> — find guns! · <b>WASD</b> move · <b>Mouse</b> aim · <b>Click</b> fire/swing · <b>1/2/3</b>/<b>Q</b> switch · <b>R</b> reload · <b>ESC</b> menu");
    env.hideOverlay();
  }

  function wallAt(x, y) { for (const w of walls) if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true; return false; }
  function canSee(ax, ay, bx, by) {
    const steps = 12; for (let i = 1; i < steps; i++) { const t = i / steps; if (wallAt(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; } return true;
  }

  function fire(from, ang, gun, isPlayer) {
    const pellets = gun.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const a = ang + rand(-gun.spread, gun.spread);
      bullets.push({ x: from.x, y: from.y, vx: Math.cos(a) * gun.speed, vy: Math.sin(a) * gun.speed,
        dmg: isPlayer ? gun.dmg : gun.dmg * 0.6, life: gun.range / gun.speed + 0.1, player: isPlayer, color: gun.color });
    }
    particles.push({ x: from.x + Math.cos(ang) * 14, y: from.y + Math.sin(ang) * 14, t: 0.07, flash: true });
  }

  function curGun() { return player.slots[player.cur]; }
  function switchTo(i) { if (player.slots[i]) { player.cur = i; player.cd = 0.15; } }
  function cycle() { for (let k = 1; k <= 3; k++) { const i = (player.cur + k) % 3; if (player.slots[i]) { switchTo(i); return; } } }

  function pickup(gunKey) {
    // fill an empty slot, else replace current
    for (let i = 0; i < 3; i++) if (!player.slots[i]) { player.slots[i] = mkGun(gunKey); player.cur = i; pop("Picked up " + GUNS[gunKey].name, GUNS[gunKey].color); return; }
    player.slots[player.cur] = mkGun(gunKey); pop("Swapped to " + GUNS[gunKey].name, GUNS[gunKey].color);
  }

  function reloadGun(g) { if (g.reloading <= 0 && g.ammo < g.mag) g.reloading = g.reload; }

  function update(dt) {
    if (over) { if (pressed.Space || mouse.clicked) reset(); return; }

    const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
    player.aim = Math.atan2(wy - player.y, wx - player.x);

    // weapon switch
    if (pressed.Digit1) switchTo(0);
    if (pressed.Digit2) switchTo(1);
    if (pressed.Digit3) switchTo(2);
    if (pressed.KeyQ) cycle();
    if (pressed.KeyR) reloadGun(curGun());

    // move
    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    const l = Math.hypot(mx, my) || 1;
    const nx = clamp(player.x + (mx / l) * player.spd * dt, 20, MAP_W - 20);
    const ny = clamp(player.y + (my / l) * player.spd * dt, 20, MAP_H - 20);
    if (!wallAt(nx, player.y)) player.x = nx;
    if (!wallAt(player.x, ny)) player.y = ny;

    // fire / swing
    const g = curGun();
    player.cd = Math.max(0, player.cd - dt);
    player.swing = Math.max(0, player.swing - dt);
    if (!g.melee && g.reloading > 0) { g.reloading -= dt; if (g.reloading <= 0) g.ammo = g.mag; }
    if ((mouse.down || keys.Space) && player.cd <= 0) {
      if (g.melee) { meleeSwing(g); player.cd = g.rate; player.swing = 0.14; }
      else if (g.reloading <= 0 && g.ammo > 0) { fire(player, player.aim, g, true); g.ammo--; player.cd = g.rate; if (g.ammo === 0) reloadGun(g); }
    }

    // loot
    loot = loot.filter((it) => {
      if (dist(it.x, it.y, player.x, player.y) < 24) {
        if (it.kind === "shield") { player.shield = Math.min(100, player.shield + 50); pop("+50 shield", "#79c0ff"); }
        else pickup(it.gun);
        return false;
      }
      return true;
    });

    // storm
    if (storm.r > storm.target) storm.r = Math.max(storm.target, storm.r - storm.shrink * dt);
    if (dist(player.x, player.y, storm.cx, storm.cy) > storm.r) player.hp -= 11 * dt;

    updateBots(dt);

    // bullets
    bullets.forEach((bu) => {
      bu.x += bu.vx * dt; bu.y += bu.vy * dt; bu.life -= dt;
      if (wallAt(bu.x, bu.y)) { bu.life = 0; return; }
      if (bu.player) {
        bots.forEach((b) => { if (b.hp > 0 && dist(bu.x, bu.y, b.x, b.y) < b.r + 3) {
          b.hp -= bu.dmg; bu.life = 0; blood(b.x, b.y, "#ff6b6b");
          if (b.state === "roam") { b.state = "engage"; b.reactT = rand(0.2, 0.5); } // getting shot alerts them
          if (b.hp <= 0) killBot(b);
        }});
      } else if (dist(bu.x, bu.y, player.x, player.y) < player.r + 3) {
        bu.life = 0; hurtPlayer(bu.dmg);
      }
    });
    bullets = bullets.filter((b) => b.life > 0);
    bots = bots.filter((b) => !b.dead && b.hp > 0);   // also drops bots that died to the storm
    alive = bots.length + (player.hp > 0 ? 1 : 0);

    particles.forEach((p) => { p.t -= dt; if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; } });
    particles = particles.filter((p) => p.t > 0);

    if (player.hp <= 0) over = "lose";
    else if (bots.length === 0) over = "win";

    cam.x = clamp(player.x - W / 2, 0, MAP_W - W);
    cam.y = clamp(player.y - H / 2, 0, MAP_H - H);

    const slots = player.slots.map((s, i) => s ? `${i + 1}:${s.name}${i === player.cur ? "*" : ""}` : `${i + 1}:—`).join("  ");
    const ammo = g.melee ? "melee" : g.reloading > 0 ? "RELOADING" : `${g.ammo}/${g.mag}`;
    env.setHud(`HP ${Math.max(0, player.hp | 0)}  🛡${player.shield | 0}  [${ammo}]  ${slots}  Kills ${kills}  Alive ${alive}`);
  }

  function updateBots(dt) {
    bots.forEach((b) => {
      const d = dist(b.x, b.y, player.x, player.y);
      // bots "loot" a real gun a little while after dropping in (like the player finding one)
      if (b.lootT != null) { b.lootT -= dt; if (b.lootT <= 0) { b.gun = mkGun(GK[(Math.random() * GK.length) | 0]); b.lootT = null; } }
      const g = b.gun;
      if (!g.melee && g.reloading > 0) { g.reloading -= dt; if (g.reloading <= 0) g.ammo = g.mag; }
      b.fireCd = Math.max(0, b.fireCd - dt);
      const inStorm = dist(b.x, b.y, storm.cx, storm.cy) < storm.r - 30;
      const sight = 340 + b.skill * 120;
      const sees = d < sight && canSee(b.x, b.y, player.x, player.y);

      // ---- state transitions ----
      if (b.hp < 32 && b.state !== "flee") b.state = "flee";
      if (b.state === "roam" && sees) { b.state = "engage"; b.reactT = rand(0.35, 0.95) * (1.4 - b.skill); }
      if (b.state === "engage") { if (sees) b.lostT = 0; else { b.lostT += dt; if (b.lostT > 1.4) b.state = "roam"; } }
      if (b.state === "flee" && b.hp >= 32 && !sees) b.state = "roam";

      // ---- movement ----
      let tx, ty, moveSpd = b.spd;
      if (!inStorm) { tx = storm.cx; ty = storm.cy; }         // always get back into the circle
      else if (b.state === "roam") {
        b.wanderT -= dt; if (b.wanderT <= 0) { b.wanderA = rand(0, 6.28); b.wanderT = rand(1, 2.5); }
        tx = b.x + Math.cos(b.wanderA) * 120; ty = b.y + Math.sin(b.wanderA) * 120; moveSpd = b.spd * 0.6;
      } else if (b.state === "flee") {
        const a = Math.atan2(b.y - player.y, b.x - player.x); tx = b.x + Math.cos(a) * 120; ty = b.y + Math.sin(a) * 120;
      } else { // engage — keep preferred range, strafe (melee rushes in)
        const pref = g.melee ? 18 : clamp(g.range * 0.7, 120, 320);
        const a = Math.atan2(player.y - b.y, player.x - b.x);
        b.strafeT -= dt; if (b.strafeT <= 0) { b.strafe *= -1; b.strafeT = rand(0.7, 1.8); }
        let radial = 0;
        if (d > pref + 40) radial = 1; else if (d < pref - 40) radial = -1;
        const pa = a + Math.PI / 2 * b.strafe;
        tx = b.x + Math.cos(a) * radial * 100 + Math.cos(pa) * 70;
        ty = b.y + Math.sin(a) * radial * 100 + Math.sin(pa) * 70;
      }
      const ma = Math.atan2(ty - b.y, tx - b.x);
      const bnx = b.x + Math.cos(ma) * moveSpd * dt, bny = b.y + Math.sin(ma) * moveSpd * dt;
      if (!wallAt(bnx, b.y)) b.x = bnx; if (!wallAt(b.x, bny)) b.y = bny;
      if (!inStorm) b.hp -= 11 * dt;

      // ---- attacking ----
      if (b.state === "engage" || (b.state === "flee" && Math.random() < 0.4)) {
        if (b.reactT > 0) b.reactT -= dt;
        else if (g.melee) {
          if (d < b.r + player.r + 6 && b.fireCd <= 0) { hurtPlayer(g.dmg * 0.6); b.fireCd = 0.8; }
        } else if (sees && d < g.range * 1.1 && g.reloading <= 0 && b.fireCd <= 0) {
          if (g.ammo > 0) {
            // aim error: worse at range and for low-skill bots; small lead
            const err = (1 - b.skill) * 0.22 + (d / 1600);
            const aim = Math.atan2(player.y - b.y, player.x - b.x) + rand(-err, err);
            fire(b, aim, g, false); g.ammo--;
            b.fireCd = g.rate * rand(1.6, 3.0);           // humans don't hold the trigger perfectly
            if (g.ammo === 0) g.reloading = g.reload;
          } else g.reloading = g.reload;
        }
      }
    });
  }

  function pop(str, color) { particles.push({ x: player.x, y: player.y - 26, str, color, t: 1.1, vy: -24, vx: 0, kind: "txt" }); }
  function blood(x, y, c) { for (let i = 0; i < 6; i++) particles.push({ x, y, vx: rand(-70, 70), vy: rand(-70, 70), t: .3, color: c }); }

  function hurtPlayer(dmg) {
    if (player.shield > 0) { const s = Math.min(player.shield, dmg); player.shield -= s; dmg -= s; }
    player.hp -= dmg; blood(player.x, player.y, "#ffd166");
  }

  function killBot(b) { b.dead = true; kills++; pop("Eliminated!", "#7ee787"); if (Math.random() < 0.7) loot.push({ x: b.x, y: b.y, kind: Math.random() < 0.5 ? "shield" : "gun", gun: GK[(Math.random() * GK.length) | 0] }); }

  function meleeSwing(g) {
    const ca = Math.cos(player.aim), sa = Math.sin(player.aim);
    bots.forEach((b) => {
      if (b.hp <= 0) return;
      const dx = b.x - player.x, dy = b.y - player.y, d = Math.hypot(dx, dy);
      if (d < g.range + b.r) {
        const dot = (dx / (d || 1)) * ca + (dy / (d || 1)) * sa;
        if (dot > 0.1 || d < b.r + 16) {
          b.hp -= g.dmg; blood(b.x, b.y, "#ff6b6b");
          if (b.state === "roam") { b.state = "engage"; b.reactT = rand(0.2, 0.5); }
          if (b.hp <= 0) killBot(b);
        }
      }
    });
  }

  function drawPerson(x, y, aim, body) {
    rectFill(ctx, x - 6, y + 4, 4, 8, "#222"); rectFill(ctx, x + 2, y + 4, 4, 8, "#222"); // legs
    rectFill(ctx, x - 9, y - 6, 18, 14, body);   // body
    rectFill(ctx, x - 6, y - 16, 12, 11, "#e8b48a"); // head
    ctx.save(); ctx.translate(x, y - 1); ctx.rotate(aim); rectFill(ctx, 6, -3, 18, 6, "#222"); ctx.restore(); // gun
  }

  function render() {
    rectFill(ctx, 0, 0, W, H, "#3a4a2e");
    const ts = 48, sx = Math.floor(cam.x / ts) * ts, sy = Math.floor(cam.y / ts) * ts;
    for (let x = sx; x < cam.x + W; x += ts)
      for (let y = sy; y < cam.y + H; y += ts)
        if (((x / ts) + (y / ts)) % 2 === 0) rectFill(ctx, x - cam.x, y - cam.y, ts, ts, "#43552f");

    walls.forEach((w) => { rectFill(ctx, w.x - cam.x, w.y - cam.y, w.w, w.h, "#6b7280"); rectFill(ctx, w.x - cam.x, w.y - cam.y, w.w, 6, "#8a94a3"); ctx.strokeStyle = "#3a3f47"; ctx.strokeRect(w.x - cam.x, w.y - cam.y, w.w, w.h); });

    loot.forEach((it) => { const x = it.x - cam.x, y = it.y - cam.y; if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
      if (it.kind === "shield") { rectFill(ctx, x - 7, y - 7, 14, 14, "#79c0ff"); } else { rectFill(ctx, x - 9, y - 4, 18, 8, GUNS[it.gun].color); rectFill(ctx, x - 9, y - 4, 4, 8, "#333"); } });

    bots.forEach((b) => {
      const x = b.x - cam.x, y = b.y - cam.y;
      const aim = Math.atan2(player.y - b.y, player.x - b.x);
      drawPerson(x, y, aim, b.state === "flee" ? "#c98a4a" : "#c94f4f");
      rectFill(ctx, x - 12, y - 24, 24, 4, "#400"); rectFill(ctx, x - 12, y - 24, 24 * clamp(b.hp / 100, 0, 1), 4, "#ff6b6b");
      if (b.state === "engage" && b.reactT > 0) text(ctx, "!", x, y - 40, 20, "#ffd166", "center");
    });

    bullets.forEach((bu) => rectFill(ctx, bu.x - cam.x - 2, bu.y - cam.y - 2, 4, 4, bu.color || "#fff"));

    const ppx = player.x - cam.x, ppy = player.y - cam.y;
    if (player.swing > 0) { ctx.fillStyle = "rgba(255,240,150,.5)"; ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.arc(ppx, ppy, curGun().range + 6, player.aim - 0.9, player.aim + 0.9); ctx.closePath(); ctx.fill(); }
    drawPerson(ppx, ppy, player.aim, "#79c0ff");

    particles.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; if (p.kind === "txt") text(ctx, p.str, x, y, 14, p.color, "center"); else if (p.flash) rectFill(ctx, x - 3, y - 3, 6, 6, "#fff7c0"); else rectFill(ctx, x - 2, y - 2, 4, 4, p.color); });

    // storm ring overlay
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(storm.cx - cam.x, storm.cy - cam.y, storm.r, 0, 7, true); ctx.fillStyle = "rgba(140,90,200,0.28)"; ctx.fill("evenodd"); ctx.restore();
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(storm.cx - cam.x, storm.cy - cam.y, storm.r, 0, 7); ctx.stroke(); ctx.lineWidth = 1;

    rectFill(ctx, mouse.x - 8, mouse.y - 1, 16, 2, "#fff"); rectFill(ctx, mouse.x - 1, mouse.y - 8, 2, 16, "#fff");

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(0, 0, W, H);
      if (over === "win") { text(ctx, "#1 VICTORY ROYALE!", W / 2, H / 2 - 40, 38, "#ffd166", "center"); text(ctx, `${kills} eliminations`, W / 2, H / 2 + 6, 18, "#fff", "center"); }
      else { text(ctx, "KNOCKED OUT", W / 2, H / 2 - 40, 42, "#ff4d4d", "center"); text(ctx, `${kills} eliminations · placed #${alive + 1}`, W / 2, H / 2 + 6, 18, "#fff", "center"); }
      text(ctx, "Press SPACE / Click to drop again", W / 2, H / 2 + 42, 15, "#8b949e", "center");
    }
  }

  Arcade.games.fortnite = { title: "BATTLE DROP", start, update, render, stop() {} };
})();
