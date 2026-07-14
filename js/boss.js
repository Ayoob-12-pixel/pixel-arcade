/* ============================================================
   GAME 1 — ASHEN ISLE  (pixel soulslike)
   Pick a race, explore an open island of POIs, loot chests for
   armour & weapons, manage stamina, dodge-roll, rest at bonfires,
   spend souls to level up, and fell 3 great bosses.
   Keys: WASD move · SPACE/Click attack · SHIFT dodge · F flask
         E interact · I inventory · M map · ESC menu
   ============================================================ */
(function () {
  const { rand, clamp, dist, rectFill, text } = Arcade;
  const W = 960, H = 600;
  const MAP_W = 3000, MAP_H = 2200;

  // ---------- data ----------
  const RACES = {
    human: { name: "Human", hp: 100, sta: 100, dmg: 12, def: 3, spd: 205, note: "Balanced. No weakness.", perk: "", color: "#d9a066", body: "#4a6fa5" },
    orc:   { name: "Orc",   hp: 155, sta: 70,  dmg: 18, def: 6, spd: 170, note: "Tanky & hard-hitting, slow, low stamina.", perk: "brute", color: "#6a9a4a", body: "#5a4a2a" },
    elf:   { name: "Elf",   hp: 78,  sta: 135, dmg: 10, def: 1, spd: 250, note: "Fast, huge stamina, 25% crit. Fragile.", perk: "crit", color: "#e6d2b5", body: "#3a7a5a" },
    undead:{ name: "Undead",hp: 92,  sta: 95,  dmg: 11, def: 2, spd: 210, note: "Heals 30% of damage dealt. Weak defense.", perk: "lifesteal", color: "#bcae9c", body: "#42324a" },
  };
  const WEAPONS = [
    { name: "Broken Sword", dmg: 6,  sta: 15, reach: 44, cd: 0.32, color: "#9aa0a6" },
    { name: "Iron Sword",   dmg: 14, sta: 18, reach: 48, cd: 0.34, color: "#c9d1d9" },
    { name: "Elf Dagger",   dmg: 10, sta: 10, reach: 36, cd: 0.20, color: "#7ee787" },
    { name: "Knight Blade", dmg: 22, sta: 24, reach: 52, cd: 0.42, color: "#79c0ff" },
    { name: "Great Cleaver",dmg: 34, sta: 40, reach: 60, cd: 0.62, color: "#ff7b4a" },
  ];
  const ARMOURS = [
    { name: "Rags",       def: 0,  spd: 0,   color: "#6b5a45" },
    { name: "Leather",    def: 6,  spd: -4,  color: "#8a5a32" },
    { name: "Chainmail",  def: 14, spd: -12, color: "#9aa0a6" },
    { name: "Knight Plate",def: 26, spd: -26, color: "#aab4c0" },
  ];

  let ctx, env, keys, pressed, mouse;
  let state, sub, player, cam, enemies, bosses, pois, drops, particles, trees;
  let msg, msgT, hoverBtn, selIndex;

  // ---------- setup ----------
  function newPlayer(raceKey) {
    const r = RACES[raceKey];
    return {
      race: raceKey, x: 300, y: MAP_H / 2, r: 13, dir: { x: 1, y: 0 },
      baseHp: r.hp, hp: r.hp, baseSta: r.sta, sta: r.sta,
      baseDmg: r.dmg, def: r.def, baseSpd: r.spd, perk: r.perk,
      color: r.color, body: r.body,
      souls: 0, vit: 0, str: 0, end: 0,
      inv: [ { type: "weapon", i: 0 }, { type: "armour", i: 0 } ],
      wIndex: 0, aIndex: 0,            // indices into WEAPONS / ARMOURS currently equipped
      estus: 3, estusMax: 3,
      atkCd: 0, atkActive: 0, staCd: 0, dodge: 0, iframe: 0, hurtCd: 0,
    };
  }

  function maxHp() { return player.baseHp + player.vit * 20; }
  function maxSta() { return player.baseSta + player.end * 15; }
  function weapon() { return WEAPONS[player.wIndex]; }
  function armour() { return ARMOURS[player.aIndex]; }
  function atkDmg() { return player.baseDmg + player.str * 5 + weapon().dmg; }
  function speed() { return Math.max(120, player.baseSpd + armour().spd); }

  function startPlay() {
    state = "play"; sub = null;
    // restore vitals & spawn position (keeps souls/levels/gear on retry — soulslike style)
    player.x = 300; player.y = MAP_H / 2; player.dir = { x: 1, y: 0 };
    player.hp = maxHp(); player.sta = maxSta(); player.estus = player.estusMax;
    player.atkCd = player.atkActive = player.iframe = player.hurtCd = player.staCd = player.dodge = 0;
    cam = { x: 0, y: 0 };
    enemies = []; bosses = []; drops = []; particles = []; trees = [];
    msg = "You awaken on the Ashen Isle. Find the bonfire (E) and hunt the 3 bosses."; msgT = 6;

    for (let i = 0; i < 70; i++) trees.push({ x: rand(120, MAP_W - 120), y: rand(120, MAP_H - 120), r: 16 });

    // POIs
    pois = [
      { x: 300, y: MAP_H / 2, type: "bonfire", name: "First Bonfire" },
      { x: 1500, y: 400, type: "bonfire", name: "Cliff Bonfire" },
      { x: 900, y: 1700, type: "chest", name: "Sunken Ruins", opened: false, loot: { type: "armour", i: 2 } },
      { x: 2300, y: 500, type: "chest", name: "Watchtower", opened: false, loot: { type: "weapon", i: 3 } },
      { x: 1600, y: 1200, type: "chest", name: "Crypt", opened: false, loot: { type: "armour", i: 3 } },
      { x: 2600, y: 1900, type: "chest", name: "Ashen Vault", opened: false, loot: { type: "weapon", i: 4 } },
      { x: 520, y: 380, type: "boss", name: "Sir Gauldric", bi: 0 },
      { x: 2600, y: 1000, type: "boss", name: "The Emberling", bi: 1 },
      { x: 1400, y: 1950, type: "boss", name: "Warden of Ash", bi: 2 },
    ];

    const bspec = [
      { name: "Sir Gauldric",  hp: 320, dmg: 16, spd: 90,  color: "#79c0ff", souls: 400 },
      { name: "The Emberling", hp: 460, dmg: 22, spd: 120, color: "#ff6b4a", souls: 700 },
      { name: "Warden of Ash", hp: 640, dmg: 30, spd: 105, color: "#b57edc", souls: 1200 },
    ];
    pois.filter(p => p.type === "boss").forEach((p) => {
      const s = bspec[p.bi];
      bosses.push({ x: p.x, y: p.y, r: 26, hp: s.hp, maxhp: s.hp, dmg: s.dmg, spd: s.spd,
        color: s.color, name: s.name, souls: s.souls, alive: true, atkCd: 0, lunge: 0, wind: 0, dmgCd: 0, bi: p.bi });
    });

    for (let i = 0; i < 30; i++) spawnEnemy();
    env.setControls("<b>WASD</b> move · <b>SPACE/Click</b> attack · <b>SHIFT</b> dodge · <b>F</b> flask · <b>E</b> interact · <b>I</b> inventory · <b>M</b> map");
  }

  function spawnEnemy() {
    let x, y, t = 0;
    do { x = rand(80, MAP_W - 80); y = rand(80, MAP_H - 80); t++; }
    while (dist(x, y, player.x, player.y) < 340 && t < 20);
    const skel = Math.random() < 0.5;
    enemies.push({ x, y, r: 12, hp: skel ? 26 : 40, maxhp: skel ? 26 : 40,
      dmg: skel ? 8 : 12, spd: rand(55, 95), souls: skel ? 25 : 45,
      color: skel ? "#e8e8e8" : "#7a5a3a", type: skel ? "skeleton" : "hollow",
      atkCd: 0, wob: rand(0, 6), dir: { x: 1, y: 0 } });
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    state = "select"; sub = null; selIndex = 0; hoverBtn = -1;
    env.setControls("Choose your race — click a card or press 1-4");
    env.hideOverlay();
  }

  // ---------- helpers ----------
  function popText(x, y, s, c) { particles.push({ x, y, str: s, color: c, t: 0.9, vy: -32, kind: "txt" }); }
  function burst(x, y, c, n) { for (let i = 0; i < n; i++) particles.push({ x, y, vx: rand(-90, 90), vy: rand(-90, 90), t: rand(.3, .6), color: c, kind: "bit" }); }
  function say(s, t) { msg = s; msgT = t || 3; }

  function drawHumanoid(x, y, dir, palette, size) {
    const s = size || 1;
    const legw = 5 * s, bodyw = 20 * s, bodyh = 20 * s, headw = 16 * s, headh = 14 * s;
    // legs
    rectFill(ctx, x - 7 * s, y + 6 * s, legw, 10 * s, "#2b2b2b");
    rectFill(ctx, x + 2 * s, y + 6 * s, legw, 10 * s, "#2b2b2b");
    // body
    rectFill(ctx, x - bodyw / 2, y - bodyh / 2 + 4 * s, bodyw, bodyh, palette.body);
    rectFill(ctx, x - bodyw / 2, y - bodyh / 2 + 4 * s, bodyw, 4 * s, "#ffffff22");
    // head
    rectFill(ctx, x - headw / 2, y - bodyh / 2 - headh + 4 * s, headw, headh, palette.skin);
    // eyes (face direction)
    const ex = dir.x >= 0 ? 2 * s : -6 * s;
    rectFill(ctx, x + ex, y - bodyh / 2 - headh / 2, 3 * s, 3 * s, "#111");
    rectFill(ctx, x + ex + 5 * s, y - bodyh / 2 - headh / 2, 3 * s, 3 * s, "#111");
    // weapon arm
    if (palette.weapon) {
      const wx = x + dir.x * 12 * s, wy = y - 2 * s + dir.y * 12 * s;
      rectFill(ctx, wx - 2, wy - 8 * s, 4, 16 * s, palette.weapon);
    }
  }

  // ---------- interaction ----------
  function equip(item) {
    if (item.type === "weapon") { player.wIndex = item.i; say("Equipped " + WEAPONS[item.i].name, 2); }
    else if (item.type === "armour") { player.aIndex = item.i; say("Equipped " + ARMOURS[item.i].name, 2); }
  }
  function drinkEstus() {
    if (player.estus <= 0) { say("No flasks left. Rest at a bonfire.", 2); return; }
    if (player.hp >= maxHp()) return;
    player.estus--; player.hp = Math.min(maxHp(), player.hp + maxHp() * 0.6);
    popText(player.x, player.y - 24, "+HP", "#ffd166");
  }
  function nearestPoi() {
    let best = null, bd = 60;
    for (const p of pois) { const d = dist(p.x, p.y, player.x, player.y); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function interact() {
    const p = nearestPoi();
    if (!p) { say("Nothing to interact with.", 1.5); return; }
    if (p.type === "bonfire") { sub = "bonfire"; }
    else if (p.type === "chest") {
      if (p.opened) { say("Empty chest.", 1.5); return; }
      p.opened = true; player.inv.push({ ...p.loot });
      const nm = p.loot.type === "weapon" ? WEAPONS[p.loot.i].name : ARMOURS[p.loot.i].name;
      say("Found " + nm + "! Opened in inventory (I).", 4);
      burst(p.x, p.y, "#ffd166", 16);
    }
  }
  function rest() {
    player.hp = maxHp(); player.sta = maxSta(); player.estus = player.estusMax;
    enemies = []; for (let i = 0; i < 30; i++) spawnEnemy();
    say("Rested. HP & flasks restored, enemies returned.", 3);
  }
  function levelUp(stat) {
    const total = player.vit + player.str + player.end;
    const cost = 60 + total * 40;
    if (player.souls < cost) { say("Not enough souls (need " + cost + ").", 2); return; }
    player.souls -= cost; player[stat]++;
    if (stat === "vit") player.hp = maxHp();
    if (stat === "end") player.sta = maxSta();
    say("Leveled up " + stat.toUpperCase() + "!", 2);
  }

  // ---------- combat ----------
  function doAttack() {
    const w = weapon();
    if (player.atkCd > 0 || player.sta < w.sta) return;
    player.atkCd = w.cd; player.atkActive = 0.16; player.sta -= w.sta; player.staCd = 0.6;
    let dmg = atkDmg();
    if (player.perk === "crit" && Math.random() < 0.25) { dmg *= 2; popText(player.x, player.y - 30, "CRIT!", "#ffd166"); }
    const hit = (o, onKill) => {
      const dx = o.x - player.x, dy = o.y - player.y, d = Math.hypot(dx, dy);
      if (d < w.reach + o.r) {
        const dot = (dx / (d || 1)) * player.dir.x + (dy / (d || 1)) * player.dir.y;
        if (dot > 0.2 || d < o.r + 18) {
          o.hp -= dmg; popText(o.x, o.y - o.r, "-" + (dmg | 0), "#fff"); burst(o.x, o.y, "#ffcf6b", 5);
          if (player.perk === "lifesteal") { player.hp = Math.min(maxHp(), player.hp + dmg * 0.3); }
          if (o.hp <= 0) onKill();
        }
      }
    };
    enemies.forEach((s) => hit(s, () => { s.dead = true; player.souls += s.souls; burst(s.x, s.y, "#79c0ff", 10); }));
    bosses.forEach((b) => { if (b.alive) hit(b, () => {
      b.alive = false; player.souls += b.souls;
      say(b.name + " has fallen! +" + b.souls + " souls.", 4); burst(b.x, b.y, b.color, 40);
    }); });
  }

  function hurtPlayer(dmg) {
    if (player.iframe > 0) return;
    const real = Math.max(1, dmg - armour().def);
    player.hp -= real; player.hurtCd = 0.5;
    popText(player.x, player.y - 26, "-" + real, "#ff5b5b");
  }

  // ---------- update ----------
  function update(dt) {
    if (state === "select") { updateSelect(); return; }
    if (state === "dead" || state === "win") { if (pressed.Space || mouse.clicked) startPlay(); return; }

    // menus (pause world)
    if (pressed.KeyI) sub = (sub === "inv") ? null : "inv";
    if (pressed.KeyM) sub = (sub === "map") ? null : "map";
    if (sub) { updateMenu(dt); return; }

    // ---- world sim ----
    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    const l = Math.hypot(mx, my) || 1;
    if (mx || my) player.dir = { x: mx / l, y: my / l };

    // dodge roll
    if ((pressed.ShiftLeft || pressed.ShiftRight) && player.dodge <= 0 && player.sta >= 25) {
      player.dodge = 0.32; player.iframe = 0.3; player.sta -= 25; player.staCd = 0.6;
    }
    let spd = speed();
    if (player.dodge > 0) { spd = 520; player.dodge -= dt; }
    player.x = clamp(player.x + (mx / l) * spd * dt, 40, MAP_W - 40);
    player.y = clamp(player.y + (my / l) * spd * dt, 40, MAP_H - 40);

    // aim / attack with mouse
    if (mouse.down) { const a = Math.atan2(mouse.y + cam.y - player.y, mouse.x + cam.x - player.x); player.dir = { x: Math.cos(a), y: Math.sin(a) }; }
    if (pressed.Space || mouse.clicked) doAttack();
    if (pressed.KeyF) drinkEstus();
    if (pressed.KeyE) interact();

    // timers
    player.atkCd = Math.max(0, player.atkCd - dt);
    player.atkActive = Math.max(0, player.atkActive - dt);
    player.iframe = Math.max(0, player.iframe - dt);
    player.hurtCd = Math.max(0, player.hurtCd - dt);
    player.staCd = Math.max(0, player.staCd - dt);
    if (player.staCd <= 0) player.sta = Math.min(maxSta(), player.sta + 42 * dt);

    // trees soft collide
    trees.forEach((t) => { const d = dist(player.x, player.y, t.x, t.y); if (d < player.r + t.r) { const a = Math.atan2(player.y - t.y, player.x - t.x); player.x = t.x + Math.cos(a) * (player.r + t.r); player.y = t.y + Math.sin(a) * (player.r + t.r); } });

    // enemies
    enemies = enemies.filter((s) => !s.dead);
    enemies.forEach((s) => {
      const d = dist(s.x, s.y, player.x, player.y);
      s.wob += dt * 3;
      if (d < 300) { const a = Math.atan2(player.y - s.y, player.x - s.x); s.dir = { x: Math.cos(a), y: Math.sin(a) }; s.x += Math.cos(a) * s.spd * dt; s.y += Math.sin(a) * s.spd * dt; }
      else { s.x += Math.cos(s.wob) * 18 * dt; s.y += Math.sin(s.wob * 0.7) * 18 * dt; }
      s.atkCd = Math.max(0, s.atkCd - dt);
      if (d < s.r + player.r + 4 && s.atkCd <= 0) { hurtPlayer(s.dmg); s.atkCd = 0.9; }
    });
    if (enemies.length < 24) spawnEnemy();

    // bosses
    bosses.forEach((b) => {
      if (!b.alive) return;
      const d = dist(b.x, b.y, player.x, player.y);
      const a = Math.atan2(player.y - b.y, player.x - b.x);
      b.dirx = Math.cos(a); b.diry = Math.sin(a);
      b.atkCd = Math.max(0, b.atkCd - dt);
      b.dmgCd = Math.max(0, b.dmgCd - dt);
      if (b.lunge > 0) { b.lunge -= dt; b.x += b.dirx * 340 * dt; b.y += b.diry * 340 * dt; }
      else if (b.wind <= 0 && d < 640 && d > 58) { b.x += b.dirx * b.spd * dt; b.y += b.diry * b.spd * dt; }
      // telegraphed wind-up, then a fast lunge
      if (d < 230 && b.atkCd <= 0 && b.wind <= 0 && b.lunge <= 0) { b.wind = 0.5; }
      if (b.wind > 0) { b.wind -= dt; if (b.wind <= 0) { b.lunge = 0.3; b.atkCd = 1.7; } }
      // contact damage on its own cooldown (dodge with SHIFT to i-frame through it)
      if (d < b.r + player.r + 6 && b.dmgCd <= 0) { hurtPlayer(b.dmg); b.dmgCd = 0.8; }
    });

    // particles
    particles.forEach((p) => { p.t -= dt; if (p.kind === "bit") { p.x += p.vx * dt; p.y += p.vy * dt; } else p.y += p.vy * dt; });
    particles = particles.filter((p) => p.t > 0);
    if (msgT > 0) msgT -= dt;

    if (player.hp <= 0) { state = "dead"; }
    if (bosses.every((b) => !b.alive)) { state = "win"; }

    cam.x = clamp(player.x - W / 2, 0, MAP_W - W);
    cam.y = clamp(player.y - H / 2, 0, MAP_H - H);
    const bl = bosses.filter((b) => b.alive).length;
    env.setHud(`${RACES[player.race].name}  HP ${player.hp | 0}/${maxHp()}  STA ${player.sta | 0}  🔥${player.estus}  ${weapon().name}/${armour().name}  Souls ${player.souls}  Bosses ${bl}`);
  }

  function updateSelect() {
    const list = Object.keys(RACES);
    for (let i = 1; i <= 4; i++) if (pressed["Digit" + i]) { player = newPlayer(list[i - 1]); startPlay(); return; }
    // hover / click cards
    hoverBtn = -1;
    list.forEach((k, i) => {
      const x = 90 + i * 200, y = 200, w = 180, h = 260;
      if (mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + h) {
        hoverBtn = i; if (mouse.clicked) { player = newPlayer(k); startPlay(); }
      }
    });
  }

  function updateMenu(dt) {
    // still tick particles a little
    particles.forEach((p) => { p.t -= dt; });
    particles = particles.filter((p) => p.t > 0);
    if (msgT > 0) msgT -= dt;

    if (sub === "bonfire") {
      if (pressed.KeyR) rest();
      if (pressed.Digit1) levelUp("vit");
      if (pressed.Digit2) levelUp("str");
      if (pressed.Digit3) levelUp("end");
      if (pressed.KeyE) sub = null;
    } else if (sub === "inv") {
      // click rows to equip/use
      if (mouse.clicked) {
        player.inv.forEach((it, i) => {
          const y = 150 + i * 34;
          if (mouse.x > W / 2 - 240 && mouse.x < W / 2 + 240 && mouse.y > y && mouse.y < y + 30) equip(it);
        });
      }
    }
    env.setHud(`${RACES[player.race].name}  HP ${player.hp | 0}/${maxHp()}  Souls ${player.souls}`);
  }

  // ---------- render ----------
  function render() {
    if (state === "select") return renderSelect();

    // ground
    rectFill(ctx, 0, 0, W, H, "#2a2f3a");
    const ts = 40, sx = Math.floor(cam.x / ts) * ts, sy = Math.floor(cam.y / ts) * ts;
    for (let x = sx; x < cam.x + W; x += ts)
      for (let y = sy; y < cam.y + H; y += ts)
        if (((x / ts) + (y / ts)) % 2 === 0) rectFill(ctx, x - cam.x, y - cam.y, ts, ts, "#313745");
    // water borders
    const b = 40; ctx.fillStyle = "#243b55";
    if (cam.x < b) ctx.fillRect(0, 0, b - cam.x, H);
    if (cam.y < b) ctx.fillRect(0, 0, W, b - cam.y);
    if (cam.x > MAP_W - W - b) ctx.fillRect(W - (cam.x - (MAP_W - W - b)), 0, cam.x - (MAP_W - W - b), H);
    if (cam.y > MAP_H - H - b) ctx.fillRect(0, H - (cam.y - (MAP_H - H - b)), W, cam.y - (MAP_H - H - b));

    // POIs
    pois.forEach((p) => {
      const x = p.x - cam.x, y = p.y - cam.y;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
      if (p.type === "bonfire") { rectFill(ctx, x - 3, y - 2, 6, 14, "#5a3a22"); rectFill(ctx, x - 8, y - 14, 16, 12, "#ff8c3a"); rectFill(ctx, x - 4, y - 22, 8, 10, "#ffd166"); }
      else if (p.type === "chest") { rectFill(ctx, x - 12, y - 8, 24, 16, p.opened ? "#4a3a2a" : "#8a5a2a"); rectFill(ctx, x - 12, y - 8, 24, 5, p.opened ? "#5a4a3a" : "#c98a3a"); }
      else if (p.type === "boss") { const alive = bosses.find(bb => bb.bi === p.bi && bb.alive); if (alive) text(ctx, "☠", x, y - 60, 20, "#ff5b5b", "center"); }
    });

    // trees
    trees.forEach((t) => { const x = t.x - cam.x, y = t.y - cam.y; if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return; rectFill(ctx, x - 3, y, 6, 16, "#3a2a1a"); ctx.fillStyle = "#2e5a3a"; ctx.beginPath(); ctx.arc(x, y - 6, 16, 0, 7); ctx.fill(); });

    // enemies
    enemies.forEach((s) => {
      const x = s.x - cam.x, y = s.y - cam.y;
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return;
      drawHumanoid(x, y, s.dir, { body: s.type === "skeleton" ? "#cfcfcf" : "#5a4a2a", skin: s.color }, 0.85);
      rectFill(ctx, x - 12, y - 26, 24, 3, "#400"); rectFill(ctx, x - 12, y - 26, 24 * clamp(s.hp / s.maxhp, 0, 1), 3, "#c33");
    });

    // bosses
    bosses.forEach((bs) => {
      if (!bs.alive) return; const x = bs.x - cam.x, y = bs.y - cam.y;
      const wind = bs.wind > 0;
      drawHumanoid(x, y, { x: bs.dirx || 1, y: bs.diry || 0 }, { body: bs.color, skin: "#e8d5c0", weapon: wind ? "#fff" : "#333" }, 1.7);
      rectFill(ctx, x - 30, y - 52, 60, 6, "#400"); rectFill(ctx, x - 30, y - 52, 60 * clamp(bs.hp / bs.maxhp, 0, 1), 6, "#ff4d4d");
      text(ctx, bs.name, x, y - 68, 12, "#fff", "center");
      if (wind) text(ctx, "!", x, y - 84, 22, "#ffd166", "center");
    });

    // drops (none currently but keep loop safe)
    // player
    const px = player.x - cam.x, py = player.y - cam.y;
    if (player.atkActive > 0) {
      ctx.fillStyle = "rgba(255,235,120,.5)"; ctx.beginPath();
      const a0 = Math.atan2(player.dir.y, player.dir.x); ctx.moveTo(px, py); ctx.arc(px, py, weapon().reach + 6, a0 - 0.9, a0 + 0.9); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = (player.iframe > 0 || (player.hurtCd > 0 && ((player.hurtCd * 20) | 0) % 2)) ? 0.45 : 1;
    drawHumanoid(px, py, player.dir, { body: player.body, skin: player.color, weapon: weapon().color }, 1);
    ctx.globalAlpha = 1;

    // bars over player
    rectFill(ctx, px - 20, py - 34, 40, 4, "#400"); rectFill(ctx, px - 20, py - 34, 40 * clamp(player.hp / maxHp(), 0, 1), 4, "#7ee787");

    // particles
    particles.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; if (p.kind === "txt") text(ctx, p.str, x, y, 14, p.color, "center"); else rectFill(ctx, x - 2, y - 2, 4, 4, p.color); });

    // HUD bars bottom-left
    rectFill(ctx, 16, H - 44, 220, 14, "#000"); rectFill(ctx, 18, H - 42, 216 * clamp(player.hp / maxHp(), 0, 1), 10, "#c0392b");
    rectFill(ctx, 16, H - 26, 220, 10, "#000"); rectFill(ctx, 18, H - 24, 216 * clamp(player.sta / maxSta(), 0, 1), 6, "#2ecc71");
    text(ctx, "HP", 20, H - 44, 10, "#fff", "left");

    // interaction prompt
    const near = nearestPoi();
    if (near) text(ctx, "[E] " + near.name, px, py + 22, 12, "#ffd166", "center");

    if (msgT > 0) { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, W, 30); text(ctx, msg, W / 2, 8, 15, "#ffd166", "center"); }

    if (sub === "inv") renderInv();
    else if (sub === "map") renderMap();
    else if (sub === "bonfire") renderBonfire();

    if (state === "dead") { ctx.fillStyle = "rgba(30,0,0,.8)"; ctx.fillRect(0, 0, W, H); text(ctx, "YOU DIED", W / 2, H / 2 - 30, 56, "#c0392b", "center"); text(ctx, "Press SPACE / Click to rise again", W / 2, H / 2 + 40, 15, "#8b949e", "center"); }
    if (state === "win") { ctx.fillStyle = "rgba(0,0,0,.82)"; ctx.fillRect(0, 0, W, H); text(ctx, "ASHEN ISLE CLEARED", W / 2, H / 2 - 30, 40, "#ffd166", "center"); text(ctx, `${RACES[player.race].name} · Souls ${player.souls}`, W / 2, H / 2 + 12, 16, "#fff", "center"); text(ctx, "Press SPACE / Click to play again", W / 2, H / 2 + 44, 15, "#8b949e", "center"); }
  }

  function renderSelect() {
    rectFill(ctx, 0, 0, W, H, "#15181f");
    text(ctx, "CHOOSE YOUR RACE", W / 2, 70, 34, "#ffd166", "center");
    text(ctx, "Each race plays differently — pick your build.", W / 2, 116, 15, "#8b949e", "center");
    const list = Object.keys(RACES);
    list.forEach((k, i) => {
      const r = RACES[k], x = 90 + i * 200, y = 200, w = 180, h = 260;
      const hov = hoverBtn === i;
      rectFill(ctx, x, y, w, h, hov ? "#242c3a" : "#1b2130");
      ctx.strokeStyle = hov ? "#ffd166" : "#30363d"; ctx.lineWidth = hov ? 3 : 2; ctx.strokeRect(x, y, w, h); ctx.lineWidth = 1;
      drawHumanoid(x + w / 2, y + 70, { x: 1, y: 0 }, { body: r.body, skin: r.color, weapon: "#c9d1d9" }, 1.6);
      text(ctx, (i + 1) + ". " + r.name, x + w / 2, y + 110, 18, "#fff", "center");
      text(ctx, "HP " + r.hp, x + 16, y + 140, 12, "#7ee787", "left");
      text(ctx, "STA " + r.sta, x + 16, y + 158, 12, "#79c0ff", "left");
      text(ctx, "DMG " + r.dmg, x + 16, y + 176, 12, "#ffd166", "left");
      text(ctx, "DEF " + r.def, x + 16, y + 194, 12, "#ff9e64", "left");
      wrap(r.note, x + 12, y + 214, w - 24, 12, "#8b949e");
    });
  }

  function wrap(str, x, y, maxw, size, color) {
    ctx.font = `bold ${size}px "Courier New", monospace`; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = color;
    const words = str.split(" "); let line = "", yy = y;
    for (const wd of words) { const test = line + wd + " "; if (ctx.measureText(test).width > maxw) { ctx.fillText(line, x, yy); line = wd + " "; yy += size + 3; } else line = test; }
    ctx.fillText(line, x, yy);
  }

  function panel() { ctx.fillStyle = "rgba(8,10,14,.9)"; ctx.fillRect(60, 70, W - 120, H - 140); ctx.strokeStyle = "#ffd166"; ctx.strokeRect(60, 70, W - 120, H - 140); }

  function renderInv() {
    panel(); text(ctx, "INVENTORY  (click to equip/use · I to close)", W / 2, 90, 18, "#ffd166", "center");
    text(ctx, `Equipped: ${weapon().name} (dmg ${atkDmg()})  ·  ${armour().name} (def ${armour().def})`, W / 2, 118, 13, "#8b949e", "center");
    player.inv.forEach((it, i) => {
      const y = 150 + i * 34; const hov = mouse.x > W / 2 - 240 && mouse.x < W / 2 + 240 && mouse.y > y && mouse.y < y + 30;
      rectFill(ctx, W / 2 - 240, y, 480, 30, hov ? "#2a3242" : "#1b2130");
      let label, col = "#fff";
      if (it.type === "weapon") { const w = WEAPONS[it.i]; label = "⚔ " + w.name + "  (dmg " + w.dmg + ", sta " + w.sta + ")"; if (player.wIndex === it.i) col = "#79c0ff"; }
      else { const a = ARMOURS[it.i]; label = "🛡 " + a.name + "  (def " + a.def + ", spd " + a.spd + ")"; if (player.aIndex === it.i) col = "#7ee787"; }
      text(ctx, label, W / 2 - 228, y + 8, 14, col, "left");
      if ((it.type === "weapon" && player.wIndex === it.i) || (it.type === "armour" && player.aIndex === it.i)) text(ctx, "EQUIPPED", W / 2 + 228, y + 8, 12, col, "right");
    });
    text(ctx, `🔥 Estus Flasks: ${player.estus}/${player.estusMax}   (press F in-game to drink)`, W / 2, 150 + player.inv.length * 34 + 12, 14, "#ffd166", "center");
  }

  function renderMap() {
    panel(); text(ctx, "MAP  (M to close)", W / 2, 90, 18, "#ffd166", "center");
    const mx = 120, my = 130, mw = W - 240, mh = H - 220;
    rectFill(ctx, mx, my, mw, mh, "#1b2130"); ctx.strokeStyle = "#30363d"; ctx.strokeRect(mx, my, mw, mh);
    const sx = mw / MAP_W, sy = mh / MAP_H;
    pois.forEach((p) => {
      const x = mx + p.x * sx, y = my + p.y * sy;
      let c = "#8b949e", lbl = p.name;
      if (p.type === "bonfire") c = "#ff8c3a";
      else if (p.type === "chest") c = p.opened ? "#555" : "#ffd166";
      else if (p.type === "boss") { const alive = bosses.find(bb => bb.bi === p.bi && bb.alive); c = alive ? "#ff4d4d" : "#3a3a3a"; }
      rectFill(ctx, x - 4, y - 4, 8, 8, c); text(ctx, lbl, x + 8, y - 6, 11, "#c9d1d9", "left");
    });
    const pxx = mx + player.x * sx, pyy = my + player.y * sy;
    rectFill(ctx, pxx - 4, pyy - 4, 8, 8, "#7ee787"); text(ctx, "YOU", pxx + 8, pyy - 6, 11, "#7ee787", "left");
  }

  function renderBonfire() {
    panel(); text(ctx, "BONFIRE", W / 2, 100, 30, "#ff8c3a", "center");
    const total = player.vit + player.str + player.end, cost = 60 + total * 40;
    text(ctx, `Souls: ${player.souls}   ·   next level cost: ${cost}`, W / 2, 150, 15, "#ffd166", "center");
    text(ctx, "[R] Rest — restore HP & flasks, respawn enemies", W / 2, 210, 15, "#e6edf3", "center");
    text(ctx, `[1] Vitality  (Lv ${player.vit}, +20 HP)`, W / 2, 260, 15, "#7ee787", "center");
    text(ctx, `[2] Strength  (Lv ${player.str}, +5 DMG)`, W / 2, 296, 15, "#ffd166", "center");
    text(ctx, `[3] Endurance (Lv ${player.end}, +15 STA)`, W / 2, 332, 15, "#79c0ff", "center");
    text(ctx, "[E] Leave bonfire", W / 2, 400, 14, "#8b949e", "center");
  }

  Arcade.games.boss = { title: "ASHEN ISLE", start, update, render, stop() {} };
})();
