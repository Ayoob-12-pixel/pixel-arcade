/* ============================================================
   GAME 1 — BOSS ISLAND
   Open-world pixel island. Roam, kill slimes for loot & XP,
   collect items, hunt down 3 bosses. Level up -> stronger.
   ============================================================ */
(function () {
  const { rand, clamp, dist, rectFill, text } = Arcade;
  const W = 960, H = 600;
  const MAP_W = 2600, MAP_H = 2000;

  let ctx, env, keys, pressed, mouse;
  let player, cam, enemies, bosses, drops, trees, particles;
  let attack, msg, msgT, bossesLeft, over;

  function reset() {
    player = {
      x: MAP_W / 2, y: MAP_H / 2, r: 14, spd: 210,
      hp: 100, maxhp: 100, dmg: 12, dir: { x: 0, y: 1 },
      xp: 0, level: 1, next: 30, coins: 0, atkCd: 0, hurtCd: 0,
    };
    cam = { x: 0, y: 0 };
    enemies = []; bosses = []; drops = []; particles = [];
    attack = { active: 0 };
    msg = "Welcome to the island. Hunt the 3 bosses!"; msgT = 4;
    over = null;

    // trees (decor + soft blockers)
    trees = [];
    for (let i = 0; i < 60; i++) {
      trees.push({ x: rand(120, MAP_W - 120), y: rand(120, MAP_H - 120), r: 18 });
    }

    // slimes
    for (let i = 0; i < 26; i++) spawnSlime();

    // 3 bosses at corners-ish
    const spots = [
      { x: 380, y: 380, name: "GLOOP KING", color: "#b57edc" },
      { x: MAP_W - 380, y: 420, name: "EMBER BEAST", color: "#ff6b4a" },
      { x: MAP_W / 2, y: MAP_H - 360, name: "THE WARDEN", color: "#4ad7d1" },
    ];
    spots.forEach((s, i) => bosses.push({
      x: s.x, y: s.y, r: 34, hp: 220 + i * 120, maxhp: 220 + i * 120,
      spd: 70 + i * 15, name: s.name, color: s.color,
      atkCd: 0, tier: i + 1, alive: true,
    }));
    bossesLeft = 3;
  }

  function spawnSlime() {
    let x, y, tries = 0;
    do { x = rand(80, MAP_W - 80); y = rand(80, MAP_H - 80); tries++; }
    while (dist(x, y, MAP_W / 2, MAP_H / 2) < 300 && tries < 20);
    enemies.push({ x, y, r: 12, hp: 20, maxhp: 20, spd: rand(45, 80), dmg: 6, atkCd: 0, wob: rand(0, 6) });
  }

  function popText(x, y, str, color) { particles.push({ x, y, str, color, t: 0.8, vy: -30, kind: "txt" }); }
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) particles.push({
      x, y, vx: rand(-90, 90), vy: rand(-90, 90), t: rand(.3, .6), color, kind: "bit",
    });
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    reset();
    env.setControls("<b>WASD / Arrows</b> move · <b>SPACE</b> or <b>Click</b> attack · <b>ESC</b> menu");
    env.hideOverlay();
  }

  function levelCheck() {
    while (player.xp >= player.next) {
      player.xp -= player.next;
      player.level++;
      player.next = Math.floor(player.next * 1.35);
      player.maxhp += 18; player.hp = player.maxhp;
      player.dmg += 4;
      msg = `LEVEL UP! Lv.${player.level} — dmg ${player.dmg}, hp ${player.maxhp}`; msgT = 3;
      popText(player.x, player.y - 20, "LEVEL UP!", "#ffd166");
    }
  }

  function doAttack() {
    if (player.atkCd > 0) return;
    player.atkCd = 0.32;
    attack.active = 0.18;
    const reach = 46, arc = player.dmg;
    // aim toward mouse if held, else facing dir
    let ax = player.dir.x, ay = player.dir.y;
    const hit = (obj, killFx) => {
      const dx = obj.x - player.x, dy = obj.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d < reach + obj.r) {
        const dot = (dx / (d || 1)) * ax + (dy / (d || 1)) * ay;
        if (dot > 0.25 || d < obj.r + 20) {
          obj.hp -= arc; popText(obj.x, obj.y - obj.r, "-" + arc, "#fff");
          burst(obj.x, obj.y, "#ffcf6b", 5);
          if (obj.hp <= 0) killFx();
        }
      }
    };
    enemies.forEach((s) => hit(s, () => {
      s.dead = true; player.xp += 8; player.coins += 2;
      if (Math.random() < 0.5) drops.push({ x: s.x, y: s.y, kind: "coin" });
      burst(s.x, s.y, "#7ee787", 10);
    }));
    bosses.forEach((b) => { if (b.alive) hit(b, () => {
      b.alive = false; bossesLeft--; player.xp += 60; player.coins += 25;
      drops.push({ x: b.x, y: b.y, kind: "orb" });
      msg = `${b.name} defeated! ${bossesLeft} boss${bossesLeft === 1 ? "" : "es"} left.`; msgT = 4;
      burst(b.x, b.y, b.color, 30);
    }); });
  }

  function update(dt) {
    if (over) { if (pressed.Space || mouse.clicked) { reset(); } return; }

    // input move
    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    const len = Math.hypot(mx, my) || 1;
    if (mx || my) { player.dir = { x: mx / len, y: my / len }; }
    player.x = clamp(player.x + (mx / len) * player.spd * dt, 40, MAP_W - 40);
    player.y = clamp(player.y + (my / len) * player.spd * dt, 40, MAP_H - 40);

    // tree soft-collision
    trees.forEach((t) => {
      const d = dist(player.x, player.y, t.x, t.y);
      if (d < player.r + t.r) {
        const a = Math.atan2(player.y - t.y, player.x - t.x);
        player.x = t.x + Math.cos(a) * (player.r + t.r);
        player.y = t.y + Math.sin(a) * (player.r + t.r);
      }
    });

    // aim toward mouse (screen->world)
    if (mouse.down) {
      const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
      const a = Math.atan2(wy - player.y, wx - player.x);
      player.dir = { x: Math.cos(a), y: Math.sin(a) };
    }
    if (pressed.Space || mouse.clicked) doAttack();

    player.atkCd = Math.max(0, player.atkCd - dt);
    player.hurtCd = Math.max(0, player.hurtCd - dt);
    if (attack.active > 0) attack.active -= dt;

    // enemies
    enemies = enemies.filter((s) => !s.dead);
    enemies.forEach((s) => {
      const d = dist(s.x, s.y, player.x, player.y);
      s.wob += dt * 3;
      if (d < 260) {
        const a = Math.atan2(player.y - s.y, player.x - s.x);
        s.x += Math.cos(a) * s.spd * dt; s.y += Math.sin(a) * s.spd * dt;
      } else {
        s.x += Math.cos(s.wob) * 20 * dt; s.y += Math.sin(s.wob * 0.7) * 20 * dt;
      }
      s.atkCd = Math.max(0, s.atkCd - dt);
      if (d < s.r + player.r && s.atkCd <= 0 && player.hurtCd <= 0) {
        player.hp -= s.dmg; player.hurtCd = 0.6; s.atkCd = 0.8;
        popText(player.x, player.y - 22, "-" + s.dmg, "#ff6b6b");
      }
    });
    if (enemies.length < 22) spawnSlime();

    // bosses
    bosses.forEach((b) => {
      if (!b.alive) return;
      const d = dist(b.x, b.y, player.x, player.y);
      if (d < 520) {
        const a = Math.atan2(player.y - b.y, player.x - b.x);
        b.x += Math.cos(a) * b.spd * dt; b.y += Math.sin(a) * b.spd * dt;
      }
      b.atkCd = Math.max(0, b.atkCd - dt);
      if (d < b.r + player.r && b.atkCd <= 0 && player.hurtCd <= 0) {
        const dmg = 10 + b.tier * 4;
        player.hp -= dmg; player.hurtCd = 0.7; b.atkCd = 0.9;
        popText(player.x, player.y - 22, "-" + dmg, "#ff4d4d");
      }
    });

    // drops pickup
    drops = drops.filter((d) => {
      if (dist(d.x, d.y, player.x, player.y) < player.r + 14) {
        if (d.kind === "coin") { player.coins += 3; popText(player.x, player.y - 20, "+3c", "#ffd166"); }
        else { player.dmg += 8; player.maxhp += 20; player.hp = player.maxhp; popText(player.x, player.y - 24, "POWER ORB! +dmg", "#b57edc"); msg = "Power Orb absorbed — you feel mightier!"; msgT = 3; }
        return false;
      }
      return true;
    });

    // particles
    particles.forEach((p) => {
      p.t -= dt;
      if (p.kind === "bit") { p.x += p.vx * dt; p.y += p.vy * dt; }
      else { p.y += p.vy * dt; }
    });
    particles = particles.filter((p) => p.t > 0);

    levelCheck();
    if (msgT > 0) msgT -= dt;

    // win/lose
    if (player.hp <= 0) { over = "lose"; }
    if (bossesLeft <= 0) { over = "win"; }

    // camera
    cam.x = clamp(player.x - W / 2, 0, MAP_W - W);
    cam.y = clamp(player.y - H / 2, 0, MAP_H - H);

    env.setHud(`Lv.${player.level}  HP ${Math.max(0, player.hp | 0)}/${player.maxhp}  DMG ${player.dmg}  ⛃${player.coins}  Bosses:${bossesLeft}`);
  }

  function render() {
    // ground
    ctx.fillStyle = "#1f6f3a"; ctx.fillRect(0, 0, W, H);
    // grass checker (world-aligned)
    const ts = 40;
    const sx = Math.floor(cam.x / ts) * ts, sy = Math.floor(cam.y / ts) * ts;
    for (let x = sx; x < cam.x + W; x += ts)
      for (let y = sy; y < cam.y + H; y += ts) {
        if (((x / ts) + (y / ts)) % 2 === 0) rectFill(ctx, x - cam.x, y - cam.y, ts, ts, "#237940");
      }
    // water border
    ctx.fillStyle = "#2b6ca3";
    const b = 40;
    if (cam.x < b) ctx.fillRect(0, 0, b - cam.x, H);
    if (cam.y < b) ctx.fillRect(0, 0, W, b - cam.y);
    if (cam.x > MAP_W - W - b) ctx.fillRect(W - (cam.x - (MAP_W - W - b)), 0, cam.x - (MAP_W - W - b), H);
    if (cam.y > MAP_H - H - b) ctx.fillRect(0, H - (cam.y - (MAP_H - H - b)), W, cam.y - (MAP_H - H - b));

    // drops
    drops.forEach((d) => {
      const x = d.x - cam.x, y = d.y - cam.y;
      if (d.kind === "coin") { rectFill(ctx, x - 5, y - 5, 10, 10, "#ffd166"); }
      else { ctx.fillStyle = "#b57edc"; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); }
    });

    // trees
    trees.forEach((t) => {
      const x = t.x - cam.x, y = t.y - cam.y;
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
      rectFill(ctx, x - 4, y, 8, 18, "#5a3a22");
      ctx.fillStyle = "#2e8b47"; ctx.beginPath(); ctx.arc(x, y - 6, 18, 0, 7); ctx.fill();
      ctx.fillStyle = "#3aa35a"; ctx.beginPath(); ctx.arc(x - 6, y - 10, 10, 0, 7); ctx.fill();
    });

    // enemies (slimes)
    enemies.forEach((s) => {
      const x = s.x - cam.x, y = s.y - cam.y;
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return;
      rectFill(ctx, x - s.r, y - s.r + 4, s.r * 2, s.r * 2 - 2, "#7ee787");
      rectFill(ctx, x - 6, y - 3, 4, 4, "#0b3");
      rectFill(ctx, x + 3, y - 3, 4, 4, "#0b3");
    });

    // bosses
    bosses.forEach((bs) => {
      if (!bs.alive) return;
      const x = bs.x - cam.x, y = bs.y - cam.y;
      rectFill(ctx, x - bs.r, y - bs.r, bs.r * 2, bs.r * 2, bs.color);
      rectFill(ctx, x - bs.r, y - bs.r, bs.r * 2, 5, "#000");
      // eyes
      rectFill(ctx, x - 12, y - 8, 7, 7, "#000");
      rectFill(ctx, x + 6, y - 8, 7, 7, "#000");
      // hp bar
      rectFill(ctx, x - bs.r, y - bs.r - 12, bs.r * 2, 6, "#400");
      rectFill(ctx, x - bs.r, y - bs.r - 12, bs.r * 2 * (bs.hp / bs.maxhp), 6, "#ff4d4d");
      text(ctx, bs.name, x, y - bs.r - 30, 12, "#fff", "center");
    });

    // player
    const px = player.x - cam.x, py = player.y - cam.y;
    // attack arc
    if (attack.active > 0) {
      ctx.fillStyle = "rgba(255,235,120,.55)";
      ctx.beginPath();
      const a0 = Math.atan2(player.dir.y, player.dir.x);
      ctx.moveTo(px, py);
      ctx.arc(px, py, 50, a0 - 0.9, a0 + 0.9);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = player.hurtCd > 0 && ((player.hurtCd * 20) | 0) % 2 ? 0.4 : 1;
    rectFill(ctx, px - player.r, py - player.r, player.r * 2, player.r * 2, "#ffd166");
    rectFill(ctx, px - 6, py - 4, 5, 5, "#000");
    rectFill(ctx, px + 2, py - 4, 5, 5, "#000");
    ctx.globalAlpha = 1;
    // facing marker
    rectFill(ctx, px + player.dir.x * 16 - 3, py + player.dir.y * 16 - 3, 6, 6, "#fff");

    // player hp bar
    rectFill(ctx, px - 20, py - player.r - 12, 40, 6, "#400");
    rectFill(ctx, px - 20, py - player.r - 12, 40 * clamp(player.hp / player.maxhp, 0, 1), 6, "#7ee787");

    // particles
    particles.forEach((p) => {
      const x = p.x - cam.x, y = p.y - cam.y;
      if (p.kind === "txt") { text(ctx, p.str, x, y, 14, p.color, "center"); }
      else rectFill(ctx, x - 2, y - 2, 4, 4, p.color);
    });

    // message banner
    if (msgT > 0) {
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, W, 30);
      text(ctx, msg, W / 2, 8, 15, "#ffd166", "center");
    }
    // xp bar
    rectFill(ctx, 0, H - 8, W, 8, "#111");
    rectFill(ctx, 0, H - 8, W * clamp(player.xp / player.next, 0, 1), 8, "#79c0ff");

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(0, 0, W, H);
      if (over === "win") {
        text(ctx, "ISLAND CLEARED!", W / 2, H / 2 - 40, 40, "#7ee787", "center");
        text(ctx, `All bosses slain · Level ${player.level} · ${player.coins} coins`, W / 2, H / 2 + 8, 16, "#fff", "center");
      } else {
        text(ctx, "YOU DIED", W / 2, H / 2 - 40, 46, "#ff4d4d", "center");
        text(ctx, `You reached Level ${player.level}`, W / 2, H / 2 + 8, 16, "#fff", "center");
      }
      text(ctx, "Press SPACE / Click to try again", W / 2, H / 2 + 44, 15, "#8b949e", "center");
    }
  }

  Arcade.games.boss = { title: "BOSS ISLAND", start, update, render, stop() {} };
})();
