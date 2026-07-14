/* ============================================================
   GAME 1 — EMBERFALL  (2D pixel soulsbourne)
   Pick a JOB (Knight / Wizard / Rogue / Cleric). Explore a lit,
   Terraria-styled world. 7 stats, mana & spells, equip weapons /
   armour / trinkets, dodge-roll, rest & level at bonfires, and
   open the MAP to fast-travel and hunt EIGHT bosses.
   Keys: WASD move · SPACE/Click attack · Q class skill · SHIFT dodge
         F heal flask · G mana flask · E interact · I inventory · M map
   ============================================================ */
(function () {
  const { rand, clamp, dist, rectFill, text, obox, hash } = Arcade;
  const W = 960, H = 600;
  const MAP_W = 4200, MAP_H = 3200;

  // ---------------- data ----------------
  const STAT_KEYS = ["vit", "end", "str", "dex", "int", "fth", "lck"];
  const STAT_NAME = { vit: "Vitality", end: "Endurance", str: "Strength", dex: "Dexterity", int: "Intelligence", fth: "Faith", lck: "Luck" };

  const JOBS = {
    knight: { name: "Knight", skill: "Bulwark — hold Q to guard (−75% dmg)", weapon: "iron_sword", armour: 2, acc: null,
      stats: { vit: 4, end: 3, str: 5, dex: 2, int: 1, fth: 1, lck: 2 },
      col: { body: "#5878a8", bodyHi: "#7aa0d0", pants: "#3a4a6a", skin: "#e6b892", skinHi: "#f2cea6", hair: "#8a8f98", hat: "helm" } },
    wizard: { name: "Wizard", skill: "Fireball — Q hurls an exploding fireball (mana)", weapon: "app_staff", armour: 0, acc: "int_ring",
      stats: { vit: 2, end: 2, str: 1, dex: 2, int: 6, fth: 2, lck: 1 },
      col: { body: "#5a3a8a", bodyHi: "#7a56b0", pants: "#3a2a5a", skin: "#e6b892", skinHi: "#f2cea6", hair: "#3a2a5a", hat: "wizard" } },
    rogue: { name: "Rogue", skill: "Shadowstep — Q dashes through foes, next hit crits (stamina)", weapon: "daggers", armour: 1, acc: "luck_charm",
      stats: { vit: 3, end: 5, str: 2, dex: 6, int: 1, fth: 1, lck: 4 },
      col: { body: "#3a6a4a", bodyHi: "#56926a", pants: "#2a3a2a", skin: "#e6b892", skinHi: "#f2cea6", hair: "#3a2a1a", hat: "hood" } },
    cleric: { name: "Cleric", skill: "Mend — Q heals you (Faith, costs mana)", weapon: "mace", armour: 2, acc: "fth_relic",
      stats: { vit: 4, end: 3, str: 3, dex: 1, int: 2, fth: 5, lck: 1 },
      col: { body: "#c9c2a8", bodyHi: "#e6dfc2", pants: "#8a8470", skin: "#e6b892", skinHi: "#f2cea6", hair: "#c0a060", hat: "none" } },
  };

  // weapons: base dmg + scaling stat, reach, cooldown, stamina, ranged?
  const WEAPONS = {
    broken:     { name: "Broken Sword", base: 5,  scale: "str", reach: 42, cd: 0.34, sta: 14, col: "#9aa0a6" },
    iron_sword: { name: "Iron Sword",   base: 12, scale: "str", reach: 48, cd: 0.36, sta: 16, col: "#c9d1d9" },
    daggers:    { name: "Twin Daggers", base: 8,  scale: "dex", reach: 34, cd: 0.18, sta: 9,  col: "#b7c7d6" },
    mace:       { name: "Iron Mace",    base: 14, scale: "str", reach: 42, cd: 0.46, sta: 20, col: "#a0a4aa" },
    app_staff:  { name: "Apprentice Staff", base: 9, scale: "int", reach: 380, cd: 0.5, sta: 8, ranged: true, pcol: "#8a56ff", col: "#7a56b0" },
    knight_gs:  { name: "Knight Greatsword", base: 26, scale: "str", reach: 58, cd: 0.6, sta: 30, col: "#79c0ff" },
    rapier:     { name: "Silver Rapier", base: 16, scale: "dex", reach: 46, cd: 0.24, sta: 12, col: "#d6e0ea" },
    fire_wand:  { name: "Flame Wand",   base: 18, scale: "int", reach: 420, cd: 0.42, sta: 10, ranged: true, pcol: "#ff7b3a", col: "#ff7b3a" },
    holy_mace:  { name: "Blessed Mace", base: 22, scale: "fth", reach: 46, cd: 0.5, sta: 22, col: "#ffe6a0" },
    great_cleaver:{ name: "Great Cleaver", base: 40, scale: "str", reach: 64, cd: 0.72, sta: 42, col: "#ff5b3a" },
  };
  const ARMOURS = [
    { name: "Cloth Robes", def: 2,  spd: 0,   col: "#7a6a55" },
    { name: "Leather",     def: 8,  spd: -5,  col: "#8a5a32" },
    { name: "Chainmail",   def: 16, spd: -12, col: "#9aa0a6" },
    { name: "Knight Plate",def: 28, spd: -24, col: "#aab4c0" },
    { name: "Dragon Mail", def: 40, spd: -30, col: "#c0504a" },
  ];
  const ACCESSORIES = {
    int_ring:   { name: "Sapphire Ring", stat: "int", amt: 3 },
    luck_charm: { name: "Rabbit Charm",  stat: "lck", amt: 3 },
    fth_relic:  { name: "Holy Relic",    stat: "fth", amt: 3 },
    str_band:   { name: "Titan Band",    stat: "str", amt: 3 },
    dex_glove:  { name: "Swift Gloves",  stat: "dex", amt: 3 },
    vit_amulet: { name: "Life Amulet",   stat: "vit", amt: 3 },
  };

  // 8 bosses across regions. type drives AI: melee / charger / caster / summoner
  const BOSS_DATA = [
    { id: 0, name: "Sir Gauldric",   type: "melee",    hp: 340,  dmg: 16, spd: 96,  col: "#79c0ff", souls: 300,  x: 700,  y: 500 },
    { id: 1, name: "The Emberling",  type: "caster",   hp: 420,  dmg: 14, spd: 70,  col: "#ff6b4a", souls: 500,  x: 3500, y: 600, pcol: "#ff7b3a" },
    { id: 2, name: "Warden of Ash",  type: "charger",  hp: 620,  dmg: 26, spd: 110, col: "#b57edc", souls: 800,  x: 2100, y: 2700 },
    { id: 3, name: "Frost Wraith",   type: "caster",   hp: 540,  dmg: 18, spd: 80,  col: "#7fe0ff", souls: 900,  x: 500,  y: 2600, pcol: "#a0e6ff" },
    { id: 4, name: "Bog Hydra",      type: "summoner", hp: 760,  dmg: 20, spd: 60,  col: "#5aa35a", souls: 1100, x: 3700, y: 2500 },
    { id: 5, name: "Bandit King",    type: "melee",    hp: 680,  dmg: 24, spd: 150, col: "#c98a4a", souls: 1200, x: 3600, y: 1500 },
    { id: 6, name: "Sun Eater",      type: "caster",   hp: 900,  dmg: 22, spd: 70,  col: "#ffd166", souls: 1600, x: 1200, y: 1400, pcol: "#ffd166" },
    { id: 7, name: "Ashen Lord",     type: "charger",  hp: 1300, dmg: 34, spd: 130, col: "#e05a5a", souls: 3000, x: 2100, y: 300 },
  ];

  let ctx, env, keys, pressed, mouse;
  let state, sub, player, cam, enemies, bosses, projs, pois, particles, trees, decor;
  let msg, msgT, hoverBtn, anim;

  // ---------------- player ----------------
  function newPlayer(jobKey) {
    const j = JOBS[jobKey];
    const p = {
      job: jobKey, x: 700, y: 700, r: 12, dir: { x: 1, y: 0 }, face: 1,
      stats: { ...j.stats }, souls: 0,
      wKey: j.weapon, aIndex: j.armour, acc: j.acc,
      inv: { weapons: [j.weapon], armours: [j.armour], accs: j.acc ? [j.acc] : [] },
      estus: 3, estusMax: 3, mflask: 2, mflaskMax: 2,
      atkCd: 0, atkActive: 0, staCd: 0, dodge: 0, iframe: 0, hurtCd: 0, guarding: false,
      skillCd: 0, roguePrimed: 0, walk: 0,
      col: j.col,
    };
    p.hp = maxHp(p); p.sta = maxSta(p); p.mana = maxMana(p);
    // give the starter accessory into inventory list already handled
    return p;
  }

  function stat(p, k) { return p.stats[k] + (p.acc && ACCESSORIES[p.acc].stat === k ? ACCESSORIES[p.acc].amt : 0); }
  function maxHp(p) { return 80 + stat(p, "vit") * 20; }
  function maxSta(p) { return 65 + stat(p, "end") * 15; }
  function maxMana(p) { return 20 + stat(p, "int") * 12 + stat(p, "fth") * 6; }
  function weapon() { return WEAPONS[player.wKey]; }
  function armour() { return ARMOURS[player.aIndex]; }
  function speed() { return Math.max(120, 210 + armour().spd); }
  function atkDmg() {
    const w = weapon(); const sc = stat(player, w.scale);
    return Math.round(w.base + sc * (w.scale === "int" || w.scale === "fth" ? 4 : 3));
  }
  function critChance() { return clamp(0.03 + stat(player, "lck") * 0.02 + stat(player, "dex") * 0.01, 0, 0.6); }

  // ---------------- world setup ----------------
  function startPlay() {
    state = "play"; sub = null; anim = 0;
    player.x = 700; player.y = 700; player.dir = { x: 1, y: 0 };
    player.hp = maxHp(player); player.sta = maxSta(player); player.mana = maxMana(player);
    player.estus = player.estusMax; player.mflask = player.mflaskMax;
    player.atkCd = player.atkActive = player.iframe = player.hurtCd = player.staCd = player.dodge = player.skillCd = 0;
    cam = { x: 0, y: 0 }; enemies = []; bosses = []; projs = []; particles = []; trees = []; decor = [];
    msg = "You awaken in Emberfall. Rest at the bonfire (E), then open the MAP (M) to travel."; msgT = 6;

    for (let i = 0; i < 130; i++) trees.push({ x: rand(120, MAP_W - 120), y: rand(120, MAP_H - 120), r: 18, k: (hash(i, 3) * 3) | 0 });
    for (let i = 0; i < 240; i++) decor.push({ x: rand(60, MAP_W - 60), y: rand(60, MAP_H - 60), t: hash(i, 7) });

    // POIs: bonfires (fast-travel) + boss markers
    pois = [
      { type: "bonfire", name: "Emberfall Shrine", x: 620, y: 700, disc: true },
      { type: "bonfire", name: "Frozen Rest", x: 620, y: 2500, disc: true },
      { type: "bonfire", name: "Ashwood Camp", x: 2100, y: 1500, disc: true },
      { type: "bonfire", name: "High Keep", x: 2100, y: 420, disc: true },
      { type: "bonfire", name: "Swamp Hut", x: 3600, y: 2500, disc: true },
      { type: "chest", name: "Ruined Vault", x: 1300, y: 900, opened: false, loot: { kind: "weapon", v: "knight_gs" } },
      { type: "chest", name: "Frost Cache", x: 900, y: 2400, opened: false, loot: { kind: "armour", v: 2 } },
      { type: "chest", name: "Bandit Stash", x: 3400, y: 1300, opened: false, loot: { kind: "weapon", v: "rapier" } },
      { type: "chest", name: "Sunken Reliquary", x: 1400, y: 1700, opened: false, loot: { kind: "acc", v: "str_band" } },
      { type: "chest", name: "Dragon Hoard", x: 2000, y: 250, opened: false, loot: { kind: "armour", v: 4 } },
      { type: "chest", name: "Pyromancer's Kit", x: 3400, y: 700, opened: false, loot: { kind: "weapon", v: "fire_wand" } },
      { type: "chest", name: "Blessed Coffer", x: 2300, y: 2600, opened: false, loot: { kind: "weapon", v: "holy_mace" } },
      { type: "chest", name: "Titan's End", x: 2300, y: 400, opened: false, loot: { kind: "weapon", v: "great_cleaver" } },
    ];
    BOSS_DATA.forEach((b) => {
      pois.push({ type: "boss", name: b.name, x: b.x, y: b.y, bid: b.id });
      bosses.push({ ...b, maxhp: b.hp, alive: true, atkCd: rand(1, 2), wind: 0, lunge: 0, dmgCd: 0, tp: 0, active: false, dirx: 1, diry: 0 });
    });

    for (let i = 0; i < 40; i++) spawnEnemy();
    env.setControls("<b>WASD</b> move · <b>SPACE/Click</b> attack · <b>Q</b> skill · <b>SHIFT</b> dodge · <b>F</b> heal · <b>G</b> mana · <b>E</b> interact · <b>I</b> inv · <b>M</b> map");
  }

  function spawnEnemy() {
    let x, y, t = 0;
    do { x = rand(80, MAP_W - 80); y = rand(80, MAP_H - 80); t++; } while (dist(x, y, player.x, player.y) < 420 && t < 25);
    const roll = Math.random();
    let e;
    if (roll < 0.4) e = { type: "skeleton", hp: 30, dmg: 8, spd: 70, souls: 25, col: "#dfe3e6" };
    else if (roll < 0.7) e = { type: "hollow", hp: 46, dmg: 12, spd: 60, souls: 40, col: "#7a5a3a" };
    else if (roll < 0.88) e = { type: "imp", hp: 34, dmg: 10, spd: 55, souls: 55, ranged: true, col: "#c0504a" };
    else e = { type: "knight", hp: 80, dmg: 16, spd: 74, souls: 90, col: "#8a94a3" };
    enemies.push({ ...e, x, y, r: 12, maxhp: e.hp, atkCd: rand(0, 1), wob: rand(0, 6), dir: { x: 1, y: 0 }, face: 1 });
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    state = "job"; sub = null; hoverBtn = -1; anim = 0;
    env.setControls("Choose your job — click a card or press 1-4");
    env.hideOverlay();
  }

  // ---------------- helpers ----------------
  function popText(x, y, s, c) { particles.push({ x, y, str: s, color: c, t: 0.9, vy: -34, kind: "txt" }); }
  function burst(x, y, c, n) { for (let i = 0; i < n; i++) particles.push({ x, y, vx: rand(-100, 100), vy: rand(-100, 100), t: rand(.3, .6), color: c, kind: "bit" }); }
  function say(s, t) { msg = s; msgT = t || 3; }
  function shoot(from, ang, spd, dmg, team, color, r, splash) { projs.push({ x: from.x, y: from.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, team, color, r: r || 5, life: 2.2, splash }); }

  // ---------------- combat ----------------
  function meleeHit(reach, dmg, crit) {
    const hit = (o, onKill) => {
      const dx = o.x - player.x, dy = o.y - player.y, d = Math.hypot(dx, dy);
      if (d < reach + o.r) {
        const dot = (dx / (d || 1)) * player.dir.x + (dy / (d || 1)) * player.dir.y;
        if (dot > 0.15 || d < o.r + 16) {
          let dm = dmg; if (crit) dm = Math.round(dm * 2);
          o.hp -= dm; popText(o.x, o.y - o.r, (crit ? "CRIT " : "") + "-" + dm, crit ? "#ffd166" : "#fff"); burst(o.x, o.y, "#ffcf6b", 5);
          if (o.hp <= 0) onKill();
        }
      }
    };
    enemies.forEach((s) => hit(s, () => { s.dead = true; player.souls += s.souls; burst(s.x, s.y, "#9ad", 10); }));
    bosses.forEach((b) => { if (b.alive) hit(b, () => killBoss(b)); });
  }
  function killBoss(b) { b.alive = false; player.souls += b.souls; say(b.name + " has fallen! +" + b.souls + " souls.", 4); burst(b.x, b.y, b.col, 46); }

  function doAttack() {
    const w = weapon();
    if (player.atkCd > 0 || player.sta < w.sta || player.guarding) return;
    player.atkCd = w.cd; player.sta -= w.sta; player.staCd = 0.55;
    const crit = Math.random() < critChance() || player.roguePrimed > 0;
    player.roguePrimed = 0;
    if (w.ranged) { shoot(player, Math.atan2(player.dir.y, player.dir.x), 520, atkDmg() * (crit ? 2 : 1), "player", w.pcol, 6); player.atkActive = 0.12; }
    else { player.atkActive = 0.16; meleeHit(w.reach, atkDmg(), crit); }
  }

  function useSkill() {
    if (player.skillCd > 0) return;
    const job = player.job;
    if (job === "wizard") {
      if (player.mana < 20) { say("Not enough mana.", 1.5); return; }
      player.mana -= 20; player.skillCd = 0.6;
      shoot(player, Math.atan2(player.dir.y, player.dir.x), 460, 30 + stat(player, "int") * 6, "player", "#ff7b3a", 9, 60);
      popText(player.x, player.y - 26, "FIREBALL!", "#ff7b3a");
    } else if (job === "cleric") {
      if (player.mana < 25) { say("Not enough mana.", 1.5); return; }
      player.mana -= 25; player.skillCd = 1.0;
      const heal = 30 + stat(player, "fth") * 10; player.hp = Math.min(maxHp(player), player.hp + heal);
      popText(player.x, player.y - 26, "+" + heal + " MEND", "#7ee787"); burst(player.x, player.y, "#ffe6a0", 14);
    } else if (job === "rogue") {
      if (player.sta < 25) { say("Not enough stamina.", 1.5); return; }
      player.sta -= 25; player.skillCd = 0.7; player.dodge = 0.28; player.iframe = 0.28; player.roguePrimed = 1;
      popText(player.x, player.y - 26, "SHADOWSTEP", "#7ee787");
    } else { /* knight guard handled by holding Q in update */ }
  }

  function hurtPlayer(dmg) {
    if (player.iframe > 0) return;
    let real = Math.max(1, dmg - armour().def);
    if (player.guarding) real = Math.max(1, Math.round(real * 0.25));
    player.hp -= real; player.hurtCd = 0.5;
    popText(player.x, player.y - 26, "-" + real, player.guarding ? "#79c0ff" : "#ff5b5b");
  }

  // ---------------- interact / progression ----------------
  function nearestPoi() { let best = null, bd = 64; for (const p of pois) { const d = dist(p.x, p.y, player.x, player.y); if (d < bd) { bd = d; best = p; } } return best; }
  function interact() {
    const p = nearestPoi();
    if (!p) { say("Nothing here.", 1.2); return; }
    if (p.type === "bonfire") { p.disc = true; sub = "bonfire"; }
    else if (p.type === "chest") {
      if (p.opened) { say("Empty.", 1.2); return; }
      p.opened = true; const L = p.loot;
      if (L.kind === "weapon") { player.inv.weapons.push(L.v); say("Found " + WEAPONS[L.v].name + "!", 4); }
      else if (L.kind === "armour") { player.inv.armours.push(L.v); say("Found " + ARMOURS[L.v].name + "!", 4); }
      else { player.inv.accs.push(L.v); say("Found " + ACCESSORIES[L.v].name + "!", 4); }
      burst(p.x, p.y, "#ffd166", 18);
    }
  }
  function rest() {
    player.hp = maxHp(player); player.sta = maxSta(player); player.mana = maxMana(player);
    player.estus = player.estusMax; player.mflask = player.mflaskMax;
    enemies = []; for (let i = 0; i < 40; i++) spawnEnemy();
    say("Rested. Fully restored; enemies returned.", 3);
  }
  function levelCost() { let t = 0; for (const k of STAT_KEYS) t += player.stats[k]; return 40 + t * 22; }
  function levelUp(k) {
    const cost = levelCost();
    if (player.souls < cost) { say("Need " + cost + " souls.", 2); return; }
    player.souls -= cost; player.stats[k]++;
    player.hp = Math.min(maxHp(player), player.hp); player.mana = Math.min(maxMana(player), player.mana);
    if (k === "vit") player.hp = maxHp(player); if (k === "end") player.sta = maxSta(player); if (k === "int" || k === "fth") player.mana = maxMana(player);
    say(STAT_NAME[k] + " +1", 1.5);
  }

  // ---------------- update ----------------
  function update(dt) {
    anim += dt;
    if (state === "job") return updateJob();
    if (state === "dead" || state === "win") { if (pressed.Space || mouse.clicked) startPlay(); return; }

    if (pressed.KeyI) sub = sub === "inv" ? null : "inv";
    if (pressed.KeyM) sub = sub === "map" ? null : "map";
    if (sub) return updateMenu(dt);

    // movement
    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    const l = Math.hypot(mx, my) || 1;
    if (mx || my) { player.dir = { x: mx / l, y: my / l }; player.walk += dt; if (mx) player.face = mx > 0 ? 1 : -1; }
    else player.walk = 0;

    // aim toward mouse when firing/holding
    if (mouse.down) { const a = Math.atan2(mouse.y + cam.y - player.y, mouse.x + cam.x - player.x); player.dir = { x: Math.cos(a), y: Math.sin(a) }; player.face = Math.cos(a) >= 0 ? 1 : -1; }

    // guard (knight, hold Q)
    player.guarding = false;
    if (player.job === "knight" && (keys.KeyQ) && player.sta > 0) { player.guarding = true; player.sta = Math.max(0, player.sta - 18 * dt); player.staCd = 0.3; }
    else if (pressed.KeyQ) useSkill();

    // dodge
    if ((pressed.ShiftLeft || pressed.ShiftRight) && player.dodge <= 0 && player.sta >= 22 && !player.guarding) { player.dodge = 0.3; player.iframe = 0.28; player.sta -= 22; player.staCd = 0.55; }
    let spd = speed(); if (player.dodge > 0) { spd = 500; player.dodge -= dt; }
    if (player.guarding) spd *= 0.4;
    player.x = clamp(player.x + (mx / l) * spd * dt, 40, MAP_W - 40);
    player.y = clamp(player.y + (my / l) * spd * dt, 40, MAP_H - 40);

    if (pressed.Space || mouse.clicked) doAttack();
    if (pressed.KeyF) { if (player.estus > 0 && player.hp < maxHp(player)) { player.estus--; player.hp = Math.min(maxHp(player), player.hp + maxHp(player) * 0.55); popText(player.x, player.y - 26, "+HP", "#ffd166"); } }
    if (pressed.KeyG) { if (player.mflask > 0 && player.mana < maxMana(player)) { player.mflask--; player.mana = Math.min(maxMana(player), player.mana + maxMana(player) * 0.6); popText(player.x, player.y - 26, "+MP", "#79c0ff"); } }
    if (pressed.KeyE) interact();

    // timers / regen
    for (const t of ["atkCd", "atkActive", "iframe", "hurtCd", "staCd", "skillCd"]) player[t] = Math.max(0, player[t] - dt);
    if (player.staCd <= 0) player.sta = Math.min(maxSta(player), player.sta + 40 * dt);
    player.mana = Math.min(maxMana(player), player.mana + 3 * dt);

    // trees collide
    trees.forEach((t) => { const d = dist(player.x, player.y, t.x, t.y); if (d < player.r + 10) { const a = Math.atan2(player.y - t.y, player.x - t.x); player.x = t.x + Math.cos(a) * (player.r + 10); player.y = t.y + Math.sin(a) * (player.r + 10); } });

    updateEnemies(dt);
    updateBosses(dt);
    updateProjs(dt);

    particles.forEach((p) => { p.t -= dt; if (p.kind === "bit") { p.x += p.vx * dt; p.y += p.vy * dt; } else p.y += p.vy * dt; });
    particles = particles.filter((p) => p.t > 0);
    if (msgT > 0) msgT -= dt;

    if (player.hp <= 0) state = "dead";
    if (bosses.every((b) => !b.alive)) state = "win";

    cam.x = clamp(player.x - W / 2, 0, MAP_W - W);
    cam.y = clamp(player.y - H / 2, 0, MAP_H - H);
    const bl = bosses.filter((b) => b.alive).length;
    env.setHud(`${JOBS[player.job].name}  HP ${player.hp | 0}/${maxHp(player)}  MP ${player.mana | 0}  🔥${player.estus} 💧${player.mflask}  ${weapon().name}  Souls ${player.souls}  Bosses ${bl}/8`);
  }

  function updateEnemies(dt) {
    enemies = enemies.filter((s) => !s.dead);
    enemies.forEach((s) => {
      const d = dist(s.x, s.y, player.x, player.y); s.wob += dt * 3;
      const a = Math.atan2(player.y - s.y, player.x - s.x);
      if (d < 360) { s.dir = { x: Math.cos(a), y: Math.sin(a) }; s.face = Math.cos(a) >= 0 ? 1 : -1; }
      s.atkCd = Math.max(0, s.atkCd - dt);
      if (s.ranged) {
        if (d < 380 && d > 70) { s.x -= Math.cos(a) * s.spd * 0.3 * dt; s.y -= Math.sin(a) * s.spd * 0.3 * dt; } // kite
        else if (d >= 70) { s.x += Math.cos(a) * s.spd * dt; s.y += Math.sin(a) * s.spd * dt; }
        if (d < 400 && s.atkCd <= 0) { shoot(s, a, 240, s.dmg, "enemy", "#ff9e64", 5); s.atkCd = 1.6; }
      } else {
        if (d < 340) { s.x += Math.cos(a) * s.spd * dt; s.y += Math.sin(a) * s.spd * dt; }
        else { s.x += Math.cos(s.wob) * 16 * dt; s.y += Math.sin(s.wob * 0.7) * 16 * dt; }
        if (d < s.r + player.r + 4 && s.atkCd <= 0) { hurtPlayer(s.dmg); s.atkCd = 0.9; }
      }
    });
    if (enemies.length < 34) spawnEnemy();
  }

  function updateBosses(dt) {
    bosses.forEach((b) => {
      if (!b.alive) return;
      const d = dist(b.x, b.y, player.x, player.y);
      if (!b.active) { if (d < 520) { b.active = true; say("⚔ " + b.name + " awakens!", 3); } else return; }
      const a = Math.atan2(player.y - b.y, player.x - b.x);
      b.dirx = Math.cos(a); b.diry = Math.sin(a);
      b.atkCd = Math.max(0, b.atkCd - dt); b.dmgCd = Math.max(0, b.dmgCd - dt);

      if (b.type === "caster") {
        // keep mid range, cast volleys, occasional teleport
        const pref = 300;
        if (d < pref - 40) { b.x -= b.dirx * b.spd * dt; b.y -= b.diry * b.spd * dt; }
        else if (d > pref + 60) { b.x += b.dirx * b.spd * dt; b.y += b.diry * b.spd * dt; }
        if (b.atkCd <= 0) { for (let k = -1; k <= 1; k++) shoot(b, a + k * 0.22, 260, b.dmg, "enemy", b.pcol || "#ff7b3a", 7); b.atkCd = 1.5; }
        b.tp -= dt; if (b.tp <= 0 && d < 130) { b.x += rand(-260, 260); b.y += rand(-260, 260); b.tp = 3; burst(b.x, b.y, b.col, 20); }
      } else if (b.type === "summoner") {
        if (d < 620 && d > 70) { b.x += b.dirx * b.spd * dt; b.y += b.diry * b.spd * dt; }
        if (b.atkCd <= 0) { for (let k = 0; k < 2; k++) enemies.push({ type: "skeleton", hp: 26, dmg: 8, spd: 90, souls: 10, col: "#cfd6da", x: b.x + rand(-30, 30), y: b.y + rand(-30, 30), r: 12, maxhp: 26, atkCd: 0.5, wob: 0, dir: { x: 1, y: 0 }, face: 1 }); b.atkCd = 4; popText(b.x, b.y - 40, "SUMMON!", b.col); }
        if (d < b.r + player.r + 6 && b.dmgCd <= 0) { hurtPlayer(b.dmg); b.dmgCd = 0.8; }
      } else { // melee / charger
        if (b.lunge > 0) { b.lunge -= dt; b.x += b.dirx * (b.type === "charger" ? 420 : 320) * dt; b.y += b.diry * (b.type === "charger" ? 420 : 320) * dt; }
        else if (b.wind <= 0 && d < 680 && d > 54) { b.x += b.dirx * b.spd * dt; b.y += b.diry * b.spd * dt; }
        if (d < (b.type === "charger" ? 300 : 210) && b.atkCd <= 0 && b.wind <= 0 && b.lunge <= 0) b.wind = b.type === "charger" ? 0.6 : 0.45;
        if (b.wind > 0) { b.wind -= dt; if (b.wind <= 0) { b.lunge = b.type === "charger" ? 0.34 : 0.28; b.atkCd = 1.7; } }
        if (d < b.r + player.r + 8 && b.dmgCd <= 0) { hurtPlayer(b.dmg); b.dmgCd = 0.7; }
      }
      b.x = clamp(b.x, 30, MAP_W - 30); b.y = clamp(b.y, 30, MAP_H - 30);
    });
  }

  function updateProjs(dt) {
    projs.forEach((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.team === "player") {
        const explode = () => { if (p.splash) { enemies.forEach((e) => { if (dist(e.x, e.y, p.x, p.y) < p.splash) { e.hp -= p.dmg * 0.6; if (e.hp <= 0) { e.dead = true; player.souls += e.souls; } } }); bosses.forEach((b) => { if (b.alive && dist(b.x, b.y, p.x, p.y) < p.splash) { b.hp -= p.dmg * 0.6; if (b.hp <= 0) killBoss(b); } }); burst(p.x, p.y, p.color, 16); } };
        for (const e of enemies) if (dist(e.x, e.y, p.x, p.y) < e.r + p.r) { e.hp -= p.dmg; popText(e.x, e.y - e.r, "-" + (p.dmg | 0), "#fff"); if (e.hp <= 0) { e.dead = true; player.souls += e.souls; } p.life = 0; explode(); break; }
        if (p.life > 0) for (const b of bosses) if (b.alive && dist(b.x, b.y, p.x, p.y) < b.r + p.r) { b.hp -= p.dmg; popText(b.x, b.y - b.r, "-" + (p.dmg | 0), "#fff"); if (b.hp <= 0) killBoss(b); p.life = 0; explode(); break; }
      } else {
        if (dist(p.x, p.y, player.x, player.y) < player.r + p.r) { hurtPlayer(p.dmg); p.life = 0; }
      }
    });
    projs = projs.filter((p) => p.life > 0 && p.x > -50 && p.x < MAP_W + 50 && p.y > -50 && p.y < MAP_H + 50);
  }

  function updateJob() {
    const list = Object.keys(JOBS);
    for (let i = 1; i <= 4; i++) if (pressed["Digit" + i]) { player = newPlayer(list[i - 1]); startPlay(); return; }
    hoverBtn = -1;
    list.forEach((k, i) => { const x = 70 + i * 210, y = 170, w = 190, h = 320; if (mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + h) { hoverBtn = i; if (mouse.clicked) { player = newPlayer(k); startPlay(); } } });
  }

  function updateMenu(dt) {
    particles.forEach((p) => { p.t -= dt; }); particles = particles.filter((p) => p.t > 0);
    if (msgT > 0) msgT -= dt;
    if (sub === "bonfire") {
      if (pressed.KeyR) rest();
      for (let i = 0; i < STAT_KEYS.length; i++) if (pressed["Digit" + (i + 1)] || (i === 6 && pressed.Digit7)) levelUp(STAT_KEYS[i]);
      if (pressed.KeyE) sub = null;
    } else if (sub === "inv") {
      if (mouse.clicked) handleInvClick();
    } else if (sub === "map") {
      if (mouse.clicked) handleMapClick();
    }
  }

  // ---------------- render ----------------
  function render() {
    if (state === "job") return renderJob();

    // ground: layered biome tint by region + procedural detail
    for (let sy = 0; sy < H; sy += 40) {
      for (let sx = 0; sx < W; sx += 40) {
        const wx = sx + (cam.x - (cam.x % 40)), wy = sy + (cam.y - (cam.y % 40));
        const n = hash((wx / 40) | 0, (wy / 40) | 0);
        const north = wy < 900, swamp = wx > 3000 && wy > 1800, frost = wx < 1200 && wy > 1800;
        let base = "#2f5f3a";
        if (north) base = "#4a4a55"; else if (swamp) base = "#3a4a2f"; else if (frost) base = "#4a5f6a";
        rectFill(ctx, wx - cam.x, wy - cam.y, 40, 40, n > 0.82 ? shade(base, 14) : n < 0.2 ? shade(base, -12) : base);
      }
    }
    // decor tufts / stones / flowers
    decor.forEach((d) => { const x = d.x - cam.x, y = d.y - cam.y; if (x < -8 || x > W + 8 || y < -8 || y > H + 8) return; if (d.t > 0.66) { rectFill(ctx, x, y, 2, 4, "#8fbf6a"); rectFill(ctx, x + 3, y - 1, 2, 5, "#7aa858"); } else if (d.t > 0.33) { rectFill(ctx, x, y, 3, 3, "#6b6b73"); } else { rectFill(ctx, x, y, 2, 2, "#ffe36b"); rectFill(ctx, x + 1, y - 1, 1, 1, "#ff9ecb"); } });

    // water borders
    const b = 40; const shimmer = Math.sin(anim * 2) * 6;
    ctx.fillStyle = "#264a6a";
    if (cam.x < b) ctx.fillRect(0, 0, b - cam.x + shimmer, H);
    if (cam.y < b) ctx.fillRect(0, 0, W, b - cam.y + shimmer);
    if (cam.x > MAP_W - W - b) ctx.fillRect(W - (cam.x - (MAP_W - W - b)) - shimmer, 0, cam.x - (MAP_W - W - b) + shimmer, H);
    if (cam.y > MAP_H - H - b) ctx.fillRect(0, H - (cam.y - (MAP_H - H - b)) - shimmer, W, cam.y - (MAP_H - H - b) + shimmer);

    // POIs
    pois.forEach((p) => {
      const x = p.x - cam.x, y = p.y - cam.y; if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
      if (p.type === "bonfire") { const fl = Math.sin(anim * 8 + p.x) * 2; obox(ctx, x - 8, y - 2, 16, 8, "#3a2a1a"); rectFill(ctx, x - 2, y - 14, 4, 12, "#5a3a22"); ctx.fillStyle = "#ff8c3a"; ctx.beginPath(); ctx.moveTo(x - 7, y - 8); ctx.quadraticCurveTo(x, y - 30 - fl, x + 7, y - 8); ctx.fill(); ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.moveTo(x - 3, y - 8); ctx.quadraticCurveTo(x, y - 22 - fl, x + 3, y - 8); ctx.fill(); }
      else if (p.type === "chest") { obox(ctx, x - 12, y - 8, 24, 16, p.opened ? "#4a3a2a" : "#8a5a2a"); rectFill(ctx, x - 12, y - 8, 24, 5, p.opened ? "#5a4a3a" : "#c98a3a"); rectFill(ctx, x - 2, y - 3, 4, 5, "#ffd166"); }
      else if (p.type === "boss") { const bb = bosses.find((z) => z.bid === p.bid); if (bb && bb.alive && !bb.active) text(ctx, "☠", x, y - 46, 22, "#ff5b5b", "center"); }
    });

    // trees
    trees.forEach((t) => { const x = t.x - cam.x, y = t.y - cam.y; if (x < -40 || x > W + 40 || y < -60 || y > H + 40) return; drawTree(x, y, t.k); });

    // enemies
    enemies.forEach((s) => { const x = s.x - cam.x, y = s.y - cam.y; if (x < -30 || x > W + 30 || y < -40 || y > H + 30) return; drawEnemy(x, y, s); rectFill(ctx, x - 12, y - 26, 24, 3, "#400"); rectFill(ctx, x - 12, y - 26, 24 * clamp(s.hp / s.maxhp, 0, 1), 3, "#c33"); });

    // bosses
    bosses.forEach((bs) => { if (!bs.alive) return; const x = bs.x - cam.x, y = bs.y - cam.y; if (x < -80 || x > W + 80 || y < -100 || y > H + 80) return; drawBoss(x, y, bs); });

    // projectiles
    projs.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 7); ctx.fill(); ctx.fillStyle = "#ffffffaa"; ctx.beginPath(); ctx.arc(x - p.r * 0.3, y - p.r * 0.3, p.r * 0.4, 0, 7); ctx.fill(); });

    // player
    const px = player.x - cam.x, py = player.y - cam.y;
    if (player.atkActive > 0 && !weapon().ranged) { ctx.fillStyle = "rgba(255,240,150,.5)"; ctx.beginPath(); const a0 = Math.atan2(player.dir.y, player.dir.x); ctx.moveTo(px, py); ctx.arc(px, py, weapon().reach + 4, a0 - 0.85, a0 + 0.85); ctx.closePath(); ctx.fill(); }
    if (player.guarding) { ctx.strokeStyle = "#79c0ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 22, 0, 7); ctx.stroke(); ctx.lineWidth = 1; }
    ctx.globalAlpha = (player.iframe > 0 || (player.hurtCd > 0 && ((player.hurtCd * 20) | 0) % 2)) ? 0.5 : 1;
    drawChar(px, py, player.face, player.col, player.walk, player.wKey);
    ctx.globalAlpha = 1;

    // lighting: soft darkness with light around player + nearby bonfires
    const grd = ctx.createRadialGradient(px, py, 70, px, py, 340);
    grd.addColorStop(0, "rgba(6,6,16,0)"); grd.addColorStop(1, "rgba(4,4,14,0.5)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    pois.forEach((p) => { if (p.type !== "bonfire") return; const x = p.x - cam.x, y = p.y - cam.y; if (x < -80 || x > W + 80 || y < -80 || y > H + 80) return; const g = ctx.createRadialGradient(x, y - 10, 4, x, y - 10, 120); g.addColorStop(0, "rgba(255,150,60,.35)"); g.addColorStop(1, "rgba(255,150,60,0)"); ctx.fillStyle = g; ctx.fillRect(x - 120, y - 130, 240, 240); });
    ctx.restore();

    // player bars over head
    rectFill(ctx, px - 20, py - 34, 40, 4, "#400"); rectFill(ctx, px - 20, py - 34, 40 * clamp(player.hp / maxHp(player), 0, 1), 4, "#7ee787");

    // particles
    particles.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; if (p.kind === "txt") text(ctx, p.str, x, y, 14, p.color, "center"); else rectFill(ctx, x - 2, y - 2, 4, 4, p.color); });

    // HUD bars
    bar(16, H - 58, 240, player.hp / maxHp(player), "#c0392b", "HP");
    bar(16, H - 40, 240, player.sta / maxSta(player), "#2ecc71", "STA");
    bar(16, H - 22, 240, player.mana / Math.max(1, maxMana(player)), "#3a86ff", "MP");

    const near = nearestPoi(); if (near) text(ctx, "[E] " + near.name, px, py + 22, 12, "#ffd166", "center");
    if (msgT > 0) { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, W, 30); text(ctx, msg, W / 2, 8, 15, "#ffd166", "center"); }

    if (sub === "inv") renderInv();
    else if (sub === "map") renderMap();
    else if (sub === "bonfire") renderBonfire();

    if (state === "dead") { ctx.fillStyle = "rgba(30,0,0,.8)"; ctx.fillRect(0, 0, W, H); text(ctx, "YOU DIED", W / 2, H / 2 - 30, 56, "#c0392b", "center"); text(ctx, "Souls kept · Press SPACE / Click to rise", W / 2, H / 2 + 40, 15, "#8b949e", "center"); }
    if (state === "win") { ctx.fillStyle = "rgba(0,0,0,.85)"; ctx.fillRect(0, 0, W, H); text(ctx, "EMBERFALL CONQUERED", W / 2, H / 2 - 30, 36, "#ffd166", "center"); text(ctx, `All 8 bosses felled · ${JOBS[player.job].name} · Souls ${player.souls}`, W / 2, H / 2 + 12, 15, "#fff", "center"); text(ctx, "Press SPACE / Click to play again", W / 2, H / 2 + 44, 15, "#8b949e", "center"); }
  }

  function bar(x, y, w, frac, col, label) { rectFill(ctx, x, y, w, 14, "#000"); rectFill(ctx, x + 2, y + 2, (w - 4) * clamp(frac, 0, 1), 10, col); text(ctx, label, x + 6, y + 1, 10, "#fff", "left"); }
  function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt; r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255); return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }

  // ------- detailed sprites (Terraria-ish) -------
  function drawWeaponInHand(wKey) {
    const w = WEAPONS[wKey]; const c = w.col;
    if (w.ranged) { // staff/wand
      obox(ctx, -12, -14, 3, 20, "#6a4a2a"); rectFill(ctx, -13, -18, 5, 6, c); return;
    }
    if (wKey === "daggers") { obox(ctx, -13, -6, 2, 10, c); return; }
    if (wKey === "mace" || wKey === "holy_mace") { obox(ctx, -12, -6, 2, 12, "#6a5030"); obox(ctx, -14, -12, 6, 6, c); return; }
    // swords
    const len = wKey === "great_cleaver" || wKey === "knight_gs" ? 22 : 14;
    obox(ctx, -12, -4, 3, 4, "#6a4a2a"); // grip
    obox(ctx, -14, -2, 7, 2, "#8a6a3a"); // guard
    obox(ctx, -12, -2 - len, 3, len, c); // blade
  }
  function drawChar(px, py, face, col, walk, wKey) {
    ctx.save(); ctx.translate(px | 0, py | 0); ctx.scale(face < 0 ? -1 : 1, 1);
    const bob = walk ? Math.sin(walk * 12) : 0;
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(0, 17, 11, 3.5, 0, 0, 7); ctx.fill();
    obox(ctx, -6, 8 + bob, 5, 9, col.pants); obox(ctx, 1, 8 - bob, 5, 9, col.pants);
    obox(ctx, -6, 15 + bob, 5, 3, "#2a2320"); obox(ctx, 1, 15 - bob, 5, 3, "#2a2320");
    obox(ctx, 4, -2, 4, 9, col.body);                 // back arm
    obox(ctx, -7, -4, 14, 13, col.body);              // torso
    rectFill(ctx, -7, -4, 14, 3, col.bodyHi);         // torso highlight
    rectFill(ctx, -7, 6, 14, 2, "#00000033");         // belt shade
    obox(ctx, -6, -16, 12, 12, col.skin);             // head
    rectFill(ctx, -6, -16, 12, 3, col.skinHi);
    // hair / hat
    if (col.hat === "wizard") { ctx.fillStyle = col.hair; ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(1, -32); ctx.lineTo(9, -14); ctx.closePath(); ctx.fill(); rectFill(ctx, -10, -15, 20, 3, shade(col.hair, 20)); }
    else if (col.hat === "helm") { obox(ctx, -7, -18, 14, 6, col.hair); rectFill(ctx, -7, -13, 14, 2, "#00000055"); rectFill(ctx, -1, -13, 2, 8, "#00000088"); }
    else if (col.hat === "hood") { obox(ctx, -8, -18, 16, 8, col.hair); ctx.fillStyle = col.hair; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-13, -2); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill(); }
    else if (col.hat === "none") { rectFill(ctx, -7, -18, 14, 4, col.hair); }
    else { rectFill(ctx, -7, -17, 14, 4, col.hair); }
    rectFill(ctx, -4, -11, 3, 3, "#161320");          // eye
    obox(ctx, -8, -2, 4, 9, col.skin);                // front arm
    if (wKey) drawWeaponInHand(wKey);
    ctx.restore();
  }
  function drawEnemy(x, y, s) {
    const face = s.face || 1;
    if (s.type === "skeleton") drawChar(x, y, face, { body: "#d7dbde", bodyHi: "#eef1f3", pants: "#b7bcc0", skin: "#e9edf0", skinHi: "#ffffff", hair: "#c7ccd0", hat: "none" }, s.wob, "broken");
    else if (s.type === "hollow") drawChar(x, y, face, { body: "#6a5238", bodyHi: "#87683f", pants: "#4a3a28", skin: "#9a8a6a", skinHi: "#b0a080", hair: "#3a2a1a", hat: "hair" }, s.wob, "broken");
    else if (s.type === "imp") drawChar(x, y, face, { body: "#a33f39", bodyHi: "#c0504a", pants: "#6a2a26", skin: "#c0504a", skinHi: "#d66", hair: "#3a1a16", hat: "hood" }, s.wob, "app_staff");
    else drawChar(x, y, face, { body: "#7a8494", bodyHi: "#9aa4b4", pants: "#4a5260", skin: "#e6b892", skinHi: "#f2cea6", hair: "#8a94a3", hat: "helm" }, s.wob, "iron_sword");
  }
  function drawBoss(x, y, bs) {
    ctx.save(); ctx.translate(x | 0, y | 0); const f = bs.dirx < 0 ? -1 : 1; ctx.scale(f, 1); ctx.scale(2.1, 2.1);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, 17, 13, 4, 0, 0, 7); ctx.fill();
    const hi = shade(bs.col, 26), lo = shade(bs.col, -26);
    obox(ctx, -6, 8, 5, 9, lo); obox(ctx, 1, 8, 5, 9, lo);
    obox(ctx, -8, -5, 16, 14, bs.col); rectFill(ctx, -8, -5, 16, 3, hi);
    obox(ctx, -7, -18, 14, 13, bs.col); rectFill(ctx, -7, -18, 14, 3, hi);
    rectFill(ctx, -4, -13, 3, 3, "#fff"); rectFill(ctx, 1, -13, 3, 3, "#fff"); // eyes glow
    // horns
    ctx.fillStyle = lo; ctx.beginPath(); ctx.moveTo(-7, -18); ctx.lineTo(-11, -28); ctx.lineTo(-4, -20); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, -18); ctx.lineTo(11, -28); ctx.lineTo(4, -20); ctx.closePath(); ctx.fill();
    if (bs.wind > 0) { rectFill(ctx, -9, -6, 18, 1, "#fff"); } // wind-up flash
    obox(ctx, -12, -4, 4, 16, "#3a3a3a"); rectFill(ctx, -13, -20, 3, 18, bs.pcol || "#c9d1d9"); // weapon
    ctx.restore();
    // name + hp
    rectFill(ctx, x - 34, y - 56, 68, 6, "#400"); rectFill(ctx, x - 34, y - 56, 68 * clamp(bs.hp / bs.maxhp, 0, 1), 6, "#ff4d4d");
    text(ctx, bs.name, x, y - 72, 12, "#fff", "center");
    if (bs.wind > 0) text(ctx, "!", x, y - 90, 22, "#ffd166", "center");
  }
  function drawTree(x, y, k) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 6, 14, 4, 0, 0, 7); ctx.fill();
    obox(ctx, x - 3, y - 6, 6, 16, "#4a3320");
    const cols = [["#2e6a3a", "#3f8a4e"], ["#2a5a55", "#3a7a72"], ["#5a5a2e", "#7a7a3e"]][k % 3];
    for (const [r, dy] of [[20, -14], [15, -26], [10, -36]]) { ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x, y + dy, r, 0, 7); ctx.fill(); ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.arc(x - r * 0.3, y + dy - r * 0.3, r * 0.5, 0, 7); ctx.fill(); }
  }

  // ---------------- screens ----------------
  function renderJob() {
    rectFill(ctx, 0, 0, W, H, "#12141c");
    for (let i = 0; i < 60; i++) { const x = (hash(i, 1) * W) | 0, y = (hash(i, 2) * H) | 0; rectFill(ctx, x, y, 2, 2, "#2a2f3a"); }
    text(ctx, "CHOOSE YOUR JOB", W / 2, 60, 34, "#ffd166", "center");
    text(ctx, "Each job has its own stats, gear and skill. Click a card or press 1-4.", W / 2, 104, 14, "#8b949e", "center");
    const list = Object.keys(JOBS);
    list.forEach((k, i) => {
      const j = JOBS[k], x = 70 + i * 210, y = 170, w = 190, h = 320, hov = hoverBtn === i;
      rectFill(ctx, x, y, w, h, hov ? "#232c3a" : "#1a2029"); ctx.strokeStyle = hov ? "#ffd166" : "#30363d"; ctx.lineWidth = hov ? 3 : 2; ctx.strokeRect(x, y, w, h); ctx.lineWidth = 1;
      drawChar(x + w / 2, y + 90, 1, j.col, anim * 2, j.weapon);
      text(ctx, (i + 1) + ". " + j.name, x + w / 2, y + 116, 18, "#fff", "center");
      let yy = y + 146;
      for (const s of STAT_KEYS) { text(ctx, STAT_NAME[s].slice(0, 3).toUpperCase() + " " + j.stats[s], x + 16, yy, 12, "#9fb0c0", "left"); yy += 16; }
      wrap(j.skill, x + 12, yy + 4, w - 24, 12, "#7ee787");
    });
  }
  function wrap(str, x, y, maxw, size, color) { ctx.font = `bold ${size}px "Courier New", monospace`; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = color; const words = str.split(" "); let line = "", yy = y; for (const wd of words) { const test = line + wd + " "; if (ctx.measureText(test).width > maxw) { ctx.fillText(line, x, yy); line = wd + " "; yy += size + 3; } else line = test; } ctx.fillText(line, x, yy); }
  function panel() { ctx.fillStyle = "rgba(8,10,14,.92)"; ctx.fillRect(50, 60, W - 100, H - 120); ctx.strokeStyle = "#ffd166"; ctx.strokeRect(50, 60, W - 100, H - 120); }

  // inventory click regions cached during render
  let invRegions = [];
  function handleInvClick() { for (const rg of invRegions) if (mouse.x > rg.x && mouse.x < rg.x + rg.w && mouse.y > rg.y && mouse.y < rg.y + rg.h) { rg.fn(); return; } }
  function renderInv() {
    panel(); invRegions = [];
    text(ctx, "INVENTORY & STATS  (I to close)", W / 2, 74, 18, "#ffd166", "center");
    // stats column
    let sy = 110; text(ctx, "STATS", 80, sy, 15, "#79c0ff", "left"); sy += 22;
    for (const s of STAT_KEYS) { text(ctx, `${STAT_NAME[s]}: ${player.stats[s]}` + (player.acc && ACCESSORIES[player.acc].stat === s ? ` (+${ACCESSORIES[player.acc].amt})` : ""), 80, sy, 13, "#c9d1d9", "left"); sy += 20; }
    sy += 6; text(ctx, `Atk Dmg: ${atkDmg()}   Def: ${armour().def}`, 80, sy, 13, "#ffd166", "left"); sy += 18;
    text(ctx, `HP ${maxHp(player)}  STA ${maxSta(player)}  MP ${maxMana(player)}`, 80, sy, 13, "#8b949e", "left"); sy += 18;
    text(ctx, `Crit ${(critChance() * 100) | 0}%   Souls ${player.souls}`, 80, sy, 13, "#8b949e", "left");
    // gear columns
    const cx = 440; let cy = 110;
    text(ctx, "WEAPONS (click to equip)", cx, cy, 14, "#79c0ff", "left"); cy += 20;
    player.inv.weapons.forEach((wk) => { const eq = player.wKey === wk; row(cx, cy, 440, `⚔ ${WEAPONS[wk].name}`, eq, () => { player.wKey = wk; say("Equipped " + WEAPONS[wk].name, 1.5); }); cy += 26; });
    cy += 8; text(ctx, "ARMOUR", cx, cy, 14, "#7ee787", "left"); cy += 20;
    player.inv.armours.forEach((ai) => { const eq = player.aIndex === ai; row(cx, cy, 440, `🛡 ${ARMOURS[ai].name} (def ${ARMOURS[ai].def})`, eq, () => { player.aIndex = ai; say("Equipped " + ARMOURS[ai].name, 1.5); }); cy += 26; });
    cy += 8; text(ctx, "TRINKETS", cx, cy, 14, "#ffd166", "left"); cy += 20;
    player.inv.accs.forEach((ak) => { const eq = player.acc === ak; row(cx, cy, 440, `💍 ${ACCESSORIES[ak].name} (+${ACCESSORIES[ak].amt} ${ACCESSORIES[ak].stat})`, eq, () => { player.acc = ak; say("Equipped " + ACCESSORIES[ak].name, 1.5); }); cy += 26; });
  }
  function row(x, y, x2, label, equipped, fn) {
    const w = x2 - x, hov = mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + 22;
    rectFill(ctx, x, y, w, 22, equipped ? "#1f5f7a" : hov ? "#2a3242" : "#1b2130");
    text(ctx, label, x + 8, y + 4, 13, "#fff", "left");
    if (equipped) text(ctx, "EQUIPPED", x + w - 8, y + 5, 11, "#7ee787", "right");
    invRegions.push({ x, y, w, h: 22, fn });
  }

  let mapRegions = [];
  function handleMapClick() { for (const rg of mapRegions) if (mouse.x > rg.x && mouse.x < rg.x + rg.w && mouse.y > rg.y && mouse.y < rg.y + rg.h) { player.x = rg.tx; player.y = rg.ty + 70; sub = null; say("Traveled to " + rg.name, 2.5); return; } }
  function renderMap() {
    panel(); mapRegions = [];
    text(ctx, "MAP — click a bonfire or boss to fast-travel  (M to close)", W / 2, 74, 15, "#ffd166", "center");
    const mx = 90, my = 110, mw = W - 180, mh = H - 210, sx = mw / MAP_W, sy = mh / MAP_H;
    rectFill(ctx, mx, my, mw, mh, "#141a24"); ctx.strokeStyle = "#30363d"; ctx.strokeRect(mx, my, mw, mh);
    // biome tints
    rectFill(ctx, mx, my, mw, mh * (900 / MAP_H), "#2a2a3520");
    pois.forEach((p) => {
      const x = mx + p.x * sx, y = my + p.y * sy;
      let c = "#8b949e", travel = false, label = p.name;
      if (p.type === "bonfire") { c = "#ff8c3a"; travel = true; }
      else if (p.type === "chest") { c = p.opened ? "#555" : "#ffd166"; }
      else if (p.type === "boss") { const bb = bosses.find((z) => z.bid === p.bid); c = bb && bb.alive ? "#ff4d4d" : "#3a3a3a"; travel = bb && bb.alive; }
      const hov = mouse.x > x - 8 && mouse.x < x + 8 && mouse.y > y - 8 && mouse.y < y + 8;
      rectFill(ctx, x - 5, y - 5, 10, 10, c);
      if (hov) { ctx.strokeStyle = "#fff"; ctx.strokeRect(x - 6, y - 6, 12, 12); text(ctx, label + (travel ? " ▶ travel" : ""), x + 10, y - 6, 12, "#fff", "left"); }
      else if (p.type === "boss") text(ctx, label, x + 8, y - 6, 10, "#c9d1d9", "left");
      if (travel) mapRegions.push({ x: x - 8, y: y - 8, w: 16, h: 16, tx: p.x, ty: p.y, name: p.name });
    });
    const pxx = mx + player.x * sx, pyy = my + player.y * sy; rectFill(ctx, pxx - 4, pyy - 4, 8, 8, "#7ee787"); text(ctx, "YOU", pxx + 8, pyy - 6, 11, "#7ee787", "left");
  }

  function renderBonfire() {
    panel(); text(ctx, "BONFIRE", W / 2, 78, 28, "#ff8c3a", "center");
    text(ctx, `Souls ${player.souls}   ·   next level: ${levelCost()}`, W / 2, 116, 14, "#ffd166", "center");
    text(ctx, "[R] Rest — restore HP/MP/flasks, respawn enemies", W / 2, 148, 14, "#e6edf3", "center");
    let y = 190;
    STAT_KEYS.forEach((s, i) => { text(ctx, `[${i + 1}] ${STAT_NAME[s]}  (Lv ${player.stats[s]})`, W / 2, y, 15, "#9fb0c0", "center"); y += 30; });
    text(ctx, "[E] Leave bonfire", W / 2, y + 6, 13, "#8b949e", "center");
  }

  Arcade.games.boss = { title: "EMBERFALL", start, update, render, stop() {} };
})();
