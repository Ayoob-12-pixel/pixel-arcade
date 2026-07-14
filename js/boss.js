/* ============================================================
   GAME 1 — EMBERFALL  (2D pixel soulsbourne, island world)
   Choose a RACE (buffs/weaknesses) and a ROLE (moveset). Explore
   a large irregular ISLAND with biomes, view the island MAP and
   fast-travel, manage stamina/mana, LIGHT & HEAVY attacks, PARRY
   and DODGE, use a hotbar, and slay 8 uniquely-designed bosses.
   ============================================================ */
(function () {
  const { rand, clamp, dist, rectFill, text, obox, hash, island, biomeColor, drawHumanoid, drawWeaponSprite } = Arcade;
  const W = 960, H = 600;
  const MAP_W = 4600, MAP_H = 4200;
  const TS = 32;

  const STAT_KEYS = ["vit", "end", "str", "dex", "int", "fth", "lck"];
  const STAT_NAME = { vit: "Vitality", end: "Endurance", str: "Strength", dex: "Dexterity", int: "Intelligence", fth: "Faith", lck: "Luck" };

  const RACES = {
    human:  { name: "Human",  note: "Balanced, adaptable. +1 all stats.", mods: { vit: 1, end: 1, str: 1, dex: 1, int: 1, fth: 1, lck: 1 }, build: 1, skin: "#e0a878", skinSh: "#c07a4a", passive: "" },
    orc:    { name: "Orc",    note: "Brutal & tough. +STR +VIT, −DEX −INT. +10% melee.", mods: { str: 4, vit: 3, dex: -2, int: -2 }, build: 1.32, skin: "#7bbf5a", skinSh: "#5a9a3f", passive: "brute" },
    elf:    { name: "Elf",    note: "Swift & arcane. +DEX +INT, −VIT. Faster, +crit.", mods: { dex: 4, int: 3, vit: -2 }, build: 0.9, skin: "#e9dcc4", skinSh: "#c9bda0", passive: "nimble" },
    dwarf:  { name: "Dwarf",  note: "Stalwart. +VIT, +armour, slower. +8 def.", mods: { vit: 4, end: 2, dex: -1 }, build: 1.12, skin: "#d99a68", skinSh: "#b87848", passive: "stone" },
    undead: { name: "Undead", note: "Cursed. Lifesteal 25%, −defense.", mods: { int: 2, fth: 1, vit: 1 }, build: 1, skin: "#b8b0a0", skinSh: "#928a7a", passive: "lifesteal" },
  };

  const ROLES = {
    knight: { name: "Knight", weapon: "iron_sword", armour: 2, skill: "Shield Bash (Q): dash + stagger",
      base: { vit: 4, end: 3, str: 5, dex: 2, int: 1, fth: 1, lck: 2 }, cloth: "#4a6fa5", clothHi: "#6a90c8", clothSh: "#34507a", pants: "#394a63", pantsSh: "#2a3850", hair: "#8a8f98", cape: "#7a2a2a" },
    wizard: { name: "Wizard", weapon: "app_staff", armour: 0, skill: "Fireball (Q): exploding blast",
      base: { vit: 2, end: 2, str: 1, dex: 2, int: 6, fth: 2, lck: 1 }, cloth: "#5a3a8a", clothHi: "#7a56b0", clothSh: "#3a2a5a", pants: "#3a2a5a", pantsSh: "#2a1f45", hair: "#3a2a5a" },
    archer: { name: "Archer", weapon: "short_bow", armour: 1, skill: "Multishot (Q): 3-arrow spread",
      base: { vit: 3, end: 4, str: 2, dex: 6, int: 1, fth: 1, lck: 4 }, cloth: "#3a6a4a", clothHi: "#56926a", clothSh: "#2a4a35", pants: "#2a3a2a", pantsSh: "#1f2c1f", hair: "#3a2a1a" },
    rogue:  { name: "Rogue",  weapon: "daggers", armour: 1, skill: "Shadowstep (Q): dash, next hit crits",
      base: { vit: 3, end: 5, str: 2, dex: 6, int: 1, fth: 1, lck: 5 }, cloth: "#3a3a44", clothHi: "#55555f", clothSh: "#26262e", pants: "#26262e", pantsSh: "#1a1a20", hair: "#2a2a2a" },
    cleric: { name: "Cleric", weapon: "mace", armour: 2, skill: "Mend (Q): heal + holy burst",
      base: { vit: 4, end: 3, str: 3, dex: 1, int: 2, fth: 6, lck: 1 }, cloth: "#c9c2a8", clothHi: "#e6dfc2", clothSh: "#9a9078", pants: "#8a8470", pantsSh: "#6a6455", hair: "#c0a060" },
  };

  const WEAPONS = {
    broken:     { name: "Broken Sword", base: 5,  scale: "str", reach: 42, cd: 0.34, sta: 14, type: "sword", color: "#9aa0a6" },
    iron_sword: { name: "Iron Sword",   base: 12, scale: "str", reach: 48, cd: 0.36, sta: 16, type: "sword", color: "#dfe6ee" },
    daggers:    { name: "Twin Daggers", base: 8,  scale: "dex", reach: 34, cd: 0.18, sta: 9,  type: "dagger", color: "#b7c7d6" },
    mace:       { name: "Iron Mace",    base: 14, scale: "str", reach: 42, cd: 0.46, sta: 20, type: "mace", color: "#c9cdd2" },
    app_staff:  { name: "Apprentice Staff", base: 9, scale: "int", reach: 400, cd: 0.5, sta: 8, ranged: true, type: "staff", pcol: "#9a6cff", color: "#7a56b0" },
    short_bow:  { name: "Short Bow",    base: 11, scale: "dex", reach: 460, cd: 0.42, sta: 10, ranged: true, type: "bow", pcol: "#e6c07a", color: "#8a5a32" },
    knight_gs:  { name: "Knight Greatsword", base: 26, scale: "str", reach: 60, cd: 0.62, sta: 32, type: "sword", big: true, color: "#9fd0ff" },
    rapier:     { name: "Silver Rapier", base: 16, scale: "dex", reach: 48, cd: 0.24, sta: 12, type: "sword", color: "#d6e0ea" },
    fire_wand:  { name: "Flame Wand",   base: 18, scale: "int", reach: 440, cd: 0.44, sta: 10, ranged: true, type: "wand", pcol: "#ff7b3a", color: "#ff7b3a" },
    holy_mace:  { name: "Blessed Mace", base: 22, scale: "fth", reach: 46, cd: 0.5, sta: 22, type: "mace", color: "#ffe6a0" },
    long_bow:   { name: "Long Bow",     base: 22, scale: "dex", reach: 560, cd: 0.55, sta: 14, ranged: true, type: "bow", pcol: "#ffd166", color: "#a06a3a" },
    great_axe:  { name: "Great Axe",    base: 40, scale: "str", reach: 60, cd: 0.74, sta: 42, type: "axe", big: true, color: "#ff6b4a" },
  };
  const ARMOURS = [
    { name: "Cloth Robes", def: 2, spd: 0, col: "#7a6a55", hi: "#9a8a70", sh: "#5a4c3c" },
    { name: "Leather", def: 8, spd: -4, col: "#8a5a32", hi: "#a5744a", sh: "#5f3d20" },
    { name: "Chainmail", def: 16, spd: -10, col: "#9aa0a6", hi: "#b8bec4", sh: "#6a6f75" },
    { name: "Knight Plate", def: 28, spd: -20, col: "#aab4c0", hi: "#cdd6df", sh: "#79828c" },
    { name: "Dragon Mail", def: 42, spd: -26, col: "#c0504a", hi: "#e06a5f", sh: "#8a332e" },
  ];
  const ACCESSORIES = {
    int_ring: { name: "Sapphire Ring", stat: "int", amt: 3 }, luck_charm: { name: "Rabbit Charm", stat: "lck", amt: 3 },
    fth_relic: { name: "Holy Relic", stat: "fth", amt: 3 }, str_band: { name: "Titan Band", stat: "str", amt: 3 },
    dex_glove: { name: "Swift Gloves", stat: "dex", amt: 3 }, vit_amulet: { name: "Life Amulet", stat: "vit", amt: 4 },
  };

  // 8 bosses, each a distinct ARCHETYPE (design) + MOVESET
  const BOSS_DATA = [
    { id: 0, name: "Sir Gauldric", arch: "knight", hp: 340, dmg: 15, spd: 96, souls: 300, col: "#6f8fc0", biome: "grass" },
    { id: 1, name: "Emberwing",    arch: "dragon", hp: 520, dmg: 18, spd: 84, souls: 600, col: "#e06a3a", biome: "rock", pcol: "#ff7b3a" },
    { id: 2, name: "Stone Warden", arch: "golem",  hp: 760, dmg: 26, spd: 46, souls: 900, col: "#8a857c", biome: "rock" },
    { id: 3, name: "Frost Wraith", arch: "wraith", hp: 560, dmg: 18, spd: 90, souls: 1000, col: "#8fdcff", biome: "grass", pcol: "#bfeaff" },
    { id: 4, name: "Bog Hydra",    arch: "hydra",  hp: 900, dmg: 20, spd: 40, souls: 1300, col: "#5aa35a", biome: "forest", pcol: "#9be36a" },
    { id: 5, name: "Bandit King",  arch: "knight", hp: 700, dmg: 22, spd: 150, souls: 1200, col: "#c98a4a", biome: "forest" },
    { id: 6, name: "Sun Eater",    arch: "demon",  hp: 1050, dmg: 24, spd: 78, souls: 1800, col: "#ffcf5a", biome: "sand", pcol: "#ffd166" },
    { id: 7, name: "Ashen Lord",   arch: "demon",  hp: 1500, dmg: 32, spd: 120, souls: 3500, col: "#d85a5a", biome: "peak", pcol: "#ff5b3a" },
  ];

  let ctx, env, keys, pressed, mouse;
  let isl, state, sub, sel, player, cam, enemies, bosses, projs, shocks, pois, particles, trees;
  let msg, msgT, hoverBtn, anim;

  // ---------- player ----------
  function newPlayer(raceKey, roleKey) {
    const R = RACES[raceKey], J = ROLES[roleKey];
    const stats = {}; STAT_KEYS.forEach((k) => stats[k] = (J.base[k] || 0) + (R.mods[k] || 0));
    STAT_KEYS.forEach((k) => stats[k] = Math.max(1, stats[k]));
    const p = {
      race: raceKey, role: roleKey, x: 0, y: 0, r: 12, dir: { x: 1, y: 0 }, face: 1, walk: 0,
      stats, souls: 0, wKey: J.weapon, aIndex: J.armour, acc: null,
      inv: { weapons: [J.weapon], armours: [J.armour], accs: [] },
      estus: 4, estusMax: 4, mflask: 3, mflaskMax: 3,
      atkCd: 0, atk: 0, atkHeavy: false, staCd: 0, dodge: 0, iframe: 0, hurtCd: 0,
      parry: 0, blockHeld: false, riposte: 0, skillCd: 0,
      build: R.build, skin: R.skin, skinSh: R.skinSh, passive: R.passive,
      cloth: J.cloth, clothHi: J.clothHi, clothSh: J.clothSh, pants: J.pants, pantsSh: J.pantsSh, hair: J.hair, cape: J.cape,
    };
    p.hp = maxHp(p); p.sta = maxSta(p); p.mana = maxMana(p);
    return p;
  }
  function stat(p, k) { return p.stats[k] + (p.acc && ACCESSORIES[p.acc].stat === k ? ACCESSORIES[p.acc].amt : 0); }
  function maxHp(p) { return 80 + stat(p, "vit") * 20; }
  function maxSta(p) { return 65 + stat(p, "end") * 15; }
  function maxMana(p) { return 20 + stat(p, "int") * 12 + stat(p, "fth") * 6; }
  function weapon() { return WEAPONS[player.wKey]; }
  function armour() { return ARMOURS[player.aIndex]; }
  function defense() { return armour().def + (player.passive === "stone" ? 8 : 0) - (player.passive === "lifesteal" ? 3 : 0); }
  function speed() { let s = 210 + armour().spd; if (player.passive === "nimble") s += 30; if (player.passive === "stone") s -= 20; return Math.max(110, s); }
  function atkDmg(heavy) {
    const w = weapon(); let d = w.base + stat(player, w.scale) * (w.scale === "int" || w.scale === "fth" ? 4 : 3);
    if (player.passive === "brute") d *= 1.1;
    if (heavy) d *= 1.9;
    return Math.round(d);
  }
  function critChance() { return clamp(0.03 + stat(player, "lck") * 0.02 + stat(player, "dex") * 0.01 + (player.passive === "nimble" ? 0.08 : 0), 0, 0.6); }

  // ---------- world ----------
  function startPlay() {
    state = "play"; sub = null; anim = 0;
    isl = island(MAP_W, MAP_H, 7);
    enemies = []; bosses = []; projs = []; shocks = []; particles = []; trees = [];
    // spawn near a beach
    const sp = isl.findLand((x, y, b) => b === "sand"); player.x = sp.x; player.y = sp.y + 40;
    player.hp = maxHp(player); player.sta = maxSta(player); player.mana = maxMana(player);
    player.estus = player.estusMax; player.mflask = player.mflaskMax;
    player.atkCd = player.atk = player.iframe = player.hurtCd = player.staCd = player.dodge = player.parry = player.skillCd = player.riposte = 0;
    cam = { x: 0, y: 0 };
    msg = "You wash ashore on the Isle of Emberfall. Open the MAP (M) to travel. Find and fell the 8 bosses."; msgT = 6;

    // trees in forest/grass
    for (let i = 0; i < 500; i++) { const x = rand(100, MAP_W - 100), y = rand(100, MAP_H - 100); const b = isl.biome(x, y); if ((b === "forest" && hash(i, 1) < 0.7) || (b === "grass" && hash(i, 2) < 0.12)) trees.push({ x, y, k: (hash(i, 3) * 3) | 0 }); }

    // POIs: bonfires + chests + bosses, placed on land
    pois = [];
    let saltN = 100;
    const spaced = (pred, minGap) => { for (let t = 0; t < 30; t++) { const s = isl.findLand(pred, 600, saltN++); if (!pois.some((p) => dist(p.x, p.y, s.x, s.y) < minGap)) return s; } return isl.findLand(pred, 600, saltN++); };
    const bf = (name, pred) => { const s = spaced(pred, 500); pois.push({ type: "bonfire", name, x: s.x, y: s.y, disc: true }); };
    bf("Shoreline Camp", (x, y, b) => b === "sand");
    bf("Greenwood Rest", (x, y, b) => b === "grass");
    bf("Deepwood Shrine", (x, y, b) => b === "forest");
    bf("Highridge Fire", (x, y, b) => b === "rock");
    bf("Hollow Bonfire", (x, y, b) => b === "grass");
    const chestLoot = [
      { kind: "weapon", v: "knight_gs" }, { kind: "weapon", v: "long_bow" }, { kind: "weapon", v: "fire_wand" },
      { kind: "weapon", v: "great_axe" }, { kind: "weapon", v: "holy_mace" }, { kind: "weapon", v: "rapier" },
      { kind: "armour", v: 3 }, { kind: "armour", v: 4 }, { kind: "acc", v: "vit_amulet" }, { kind: "acc", v: "str_band" },
    ];
    chestLoot.forEach((L) => { const s = spaced((x, y, b) => b === "forest" || b === "rock", 260); pois.push({ type: "chest", name: "Cache", x: s.x, y: s.y, opened: false, loot: L }); });

    BOSS_DATA.forEach((b) => {
      const s = spaced((x, y, bi) => bi === b.biome, 700);
      pois.push({ type: "boss", name: b.name, x: s.x, y: s.y, bid: b.id });
      bosses.push({ ...b, x: s.x, y: s.y, maxhp: b.hp, alive: true, active: false, atkCd: rand(1, 2), wind: 0, lunge: 0, dmgCd: 0, tp: 2, stun: 0, dirx: 1, diry: 0, phase: 0 });
    });

    for (let i = 0; i < 42; i++) spawnEnemy();
    env.setControls("<b>WASD</b> move · <b>L-Click</b> light · <b>SPACE</b> heavy · <b>R-Click/F</b> parry &amp; block · <b>SHIFT</b> dodge · <b>Q</b> skill · <b>1-4</b> hotbar · <b>E</b> · <b>I</b> · <b>M</b>");
  }

  function spawnEnemy() {
    let x, y, t = 0;
    do { x = rand(80, MAP_W - 80); y = rand(80, MAP_H - 80); t++; } while ((dist(x, y, player.x, player.y) < 420 || !isl.passable(x, y)) && t < 40);
    if (!isl.passable(x, y)) return;
    const roll = Math.random(); let e;
    if (roll < 0.4) e = { type: "skeleton", hp: 30, dmg: 8, spd: 70, souls: 25 };
    else if (roll < 0.7) e = { type: "hollow", hp: 46, dmg: 12, spd: 60, souls: 40 };
    else if (roll < 0.88) e = { type: "imp", hp: 34, dmg: 10, spd: 55, souls: 55, ranged: true };
    else e = { type: "knight", hp: 82, dmg: 16, spd: 76, souls: 90 };
    enemies.push({ ...e, x, y, r: 12, maxhp: e.hp, atkCd: rand(0, 1), stun: 0, wob: rand(0, 6), dir: { x: 1, y: 0 }, face: 1, walk: 0 });
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    state = "race"; sub = null; sel = { race: null }; hoverBtn = -1; anim = 0;
    env.setControls("Choose your race, then your role.");
    env.hideOverlay();
  }

  // ---------- helpers ----------
  function popText(x, y, s, c) { particles.push({ x, y, str: s, color: c, t: 0.9, vy: -34, kind: "txt" }); }
  function burst(x, y, c, n) { for (let i = 0; i < n; i++) particles.push({ x, y, vx: rand(-110, 110), vy: rand(-110, 110), t: rand(.3, .6), color: c, kind: "bit" }); }
  function spark(x, y) { for (let i = 0; i < 12; i++) particles.push({ x, y, vx: rand(-160, 160), vy: rand(-160, 160), t: rand(.2, .4), color: "#fff3b0", kind: "bit" }); }
  function say(s, t) { msg = s; msgT = t || 3; }
  function shootP(from, ang, spd, dmg, team, color, r, opt) { projs.push({ x: from.x, y: from.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, team, color, r: r || 5, life: (opt && opt.life) || 2.4, splash: opt && opt.splash, homing: opt && opt.homing }); }

  // ---------- combat ----------
  function meleeHit(reach, dmg, crit, knock) {
    const hit = (o, onKill) => {
      const dx = o.x - player.x, dy = o.y - player.y, d = Math.hypot(dx, dy);
      if (d < reach + o.r) {
        const dot = (dx / (d || 1)) * player.dir.x + (dy / (d || 1)) * player.dir.y;
        if (dot > 0.1 || d < o.r + 16) {
          let dm = dmg; if (crit) dm = Math.round(dm * 2.2);
          o.hp -= dm; popText(o.x, o.y - o.r, (crit ? "CRIT " : "") + "-" + (dm | 0), crit ? "#ffd166" : "#fff"); burst(o.x, o.y, "#ffcf6b", 5);
          if (knock) { o.x += (dx / (d || 1)) * knock; o.y += (dy / (d || 1)) * knock; }
          if (player.passive === "lifesteal") player.hp = Math.min(maxHp(player), player.hp + dm * 0.25);
          if (o.hp <= 0) onKill();
        }
      }
    };
    enemies.forEach((s) => hit(s, () => { s.dead = true; player.souls += s.souls; burst(s.x, s.y, "#9ad", 10); }));
    bosses.forEach((b) => { if (b.alive) hit(b, () => killBoss(b)); });
  }
  function killBoss(b) { b.alive = false; player.souls += b.souls; say(b.name + " has fallen! +" + b.souls + " souls.", 4); burst(b.x, b.y, b.col, 60); }

  function doAttack(heavy) {
    const w = weapon(); const cost = heavy ? w.sta * 2 : w.sta;
    if (player.atkCd > 0 || player.sta < cost || player.blockHeld) return;
    player.atkCd = heavy ? w.cd * 1.7 : w.cd; player.sta -= cost; player.staCd = 0.5; player.atk = 0.001; player.atkHeavy = heavy;
    const crit = Math.random() < critChance() || player.riposte > 0; player.riposte = 0;
    const dmg = atkDmg(heavy) * (player.riposte > 0 ? 1 : 1);
    if (w.ranged) {
      const a = Math.atan2(player.dir.y, player.dir.x);
      if (heavy) shootP(player, a, 720, dmg, "player", w.pcol, 9, { splash: 40 });
      else shootP(player, a, 560, dmg, "player", w.pcol, 6);
    } else meleeHit(w.reach + (heavy ? 8 : 0), dmg, crit, heavy ? 26 : 8);
  }

  function useSkill() {
    if (player.skillCd > 0) return;
    const a = Math.atan2(player.dir.y, player.dir.x);
    if (player.role === "wizard") { if (player.mana < 20) return say("Low mana.", 1.2); player.mana -= 20; player.skillCd = 0.7; shootP(player, a, 460, 34 + stat(player, "int") * 6, "player", "#ff7b3a", 10, { splash: 66 }); popText(player.x, player.y - 26, "FIREBALL!", "#ff7b3a"); }
    else if (player.role === "archer") { if (player.sta < 18) return say("Low stamina.", 1.2); player.sta -= 18; player.skillCd = 0.6; for (let k = -1; k <= 1; k++) shootP(player, a + k * 0.18, 620, atkDmg(false), "player", "#e6c07a", 6); popText(player.x, player.y - 26, "MULTISHOT!", "#e6c07a"); }
    else if (player.role === "cleric") { if (player.mana < 24) return say("Low mana.", 1.2); player.mana -= 24; player.skillCd = 1.0; const heal = 34 + stat(player, "fth") * 10; player.hp = Math.min(maxHp(player), player.hp + heal); enemies.forEach((e) => { if (dist(e.x, e.y, player.x, player.y) < 90) { e.hp -= 30 + stat(player, "fth") * 4; } }); popText(player.x, player.y - 26, "+" + heal + " MEND", "#7ee787"); burst(player.x, player.y, "#ffe6a0", 18); }
    else if (player.role === "rogue") { if (player.sta < 24) return say("Low stamina.", 1.2); player.sta -= 24; player.skillCd = 0.7; player.dodge = 0.26; player.iframe = 0.26; player.riposte = 1; player.x += player.dir.x * 120; player.y += player.dir.y * 120; popText(player.x, player.y - 26, "SHADOWSTEP", "#7ee787"); }
    else { if (player.sta < 22) return say("Low stamina.", 1.2); player.sta -= 22; player.skillCd = 0.8; player.dodge = 0.2; player.x += player.dir.x * 90; player.y += player.dir.y * 90; enemies.concat(bosses.filter((b) => b.alive)).forEach((o) => { if (dist(o.x, o.y, player.x, player.y) < 70) { o.hp -= atkDmg(false); o.stun = 1.0; } }); popText(player.x, player.y - 26, "SHIELD BASH!", "#79c0ff"); }
  }

  function hurtPlayer(dmg, src, proj) {
    if (player.iframe > 0) return;
    if (player.parry > 0) {
      spark(player.x + player.dir.x * 16, player.y + player.dir.y * 16); popText(player.x, player.y - 28, "PARRY!", "#8ad3ff");
      player.riposte = 1;
      if (src && "stun" in src) src.stun = 1.4;
      if (proj) { proj.team = "player"; proj.vx *= -1; proj.vy *= -1; proj.dmg *= 1.5; }  // reflect
      return;
    }
    let real = Math.max(1, dmg - defense());
    if (player.blockHeld && player.sta > 0) { real = Math.max(1, Math.round(real * 0.3)); player.sta = Math.max(0, player.sta - real * 0.8); player.staCd = 0.3; }
    player.hp -= real; player.hurtCd = 0.45;
    popText(player.x, player.y - 26, "-" + real, player.blockHeld ? "#79c0ff" : "#ff5b5b");
  }

  // ---------- interact / progression ----------
  function nearestPoi() { let best = null, bd = 66; for (const p of pois) { const d = dist(p.x, p.y, player.x, player.y); if (d < bd) { bd = d; best = p; } } return best; }
  function interact() {
    const p = nearestPoi(); if (!p) return say("Nothing here.", 1.2);
    if (p.type === "bonfire") { sub = "bonfire"; }
    else if (p.type === "chest") { if (p.opened) return say("Empty.", 1.2); p.opened = true; const L = p.loot;
      if (L.kind === "weapon") { player.inv.weapons.push(L.v); say("Found " + WEAPONS[L.v].name + "!", 4); }
      else if (L.kind === "armour") { player.inv.armours.push(L.v); say("Found " + ARMOURS[L.v].name + "!", 4); }
      else { player.inv.accs.push(L.v); say("Found " + ACCESSORIES[L.v].name + "!", 4); }
      burst(p.x, p.y, "#ffd166", 18); }
  }
  function rest() { player.hp = maxHp(player); player.sta = maxSta(player); player.mana = maxMana(player); player.estus = player.estusMax; player.mflask = player.mflaskMax; enemies = []; for (let i = 0; i < 42; i++) spawnEnemy(); say("Rested. Restored; foes returned.", 3); }
  function levelCost() { let t = 0; for (const k of STAT_KEYS) t += player.stats[k]; return 40 + t * 20; }
  function levelUp(k) { const cost = levelCost(); if (player.souls < cost) return say("Need " + cost + " souls.", 2); player.souls -= cost; player.stats[k]++; if (k === "vit") player.hp = maxHp(player); if (k === "end") player.sta = maxSta(player); if (k === "int" || k === "fth") player.mana = maxMana(player); say(STAT_NAME[k] + " +1", 1.4); }

  function drinkEstus() { if (player.estus > 0 && player.hp < maxHp(player)) { player.estus--; player.hp = Math.min(maxHp(player), player.hp + maxHp(player) * 0.55); popText(player.x, player.y - 26, "+HP", "#ffd166"); } }
  function drinkMana() { if (player.mflask > 0 && player.mana < maxMana(player)) { player.mflask--; player.mana = Math.min(maxMana(player), player.mana + maxMana(player) * 0.6); popText(player.x, player.y - 26, "+MP", "#79c0ff"); } }

  // ---------- update ----------
  function update(dt) {
    anim += dt;
    if (state === "race") return updateRace();
    if (state === "role") return updateRole();
    if (state === "dead" || state === "win") { if (pressed.Space || mouse.clicked) startPlay(); return; }
    if (pressed.KeyI) sub = sub === "inv" ? null : "inv";
    if (pressed.KeyM) sub = sub === "map" ? null : "map";
    if (sub) return updateMenu(dt);

    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    const l = Math.hypot(mx, my) || 1;
    if (mx || my) { player.walk += dt; } else player.walk = 0;
    // aim toward mouse
    const aa = Math.atan2(mouse.y + cam.y - player.y, mouse.x + cam.x - player.x);
    player.dir = { x: Math.cos(aa), y: Math.sin(aa) }; player.face = Math.cos(aa) >= 0 ? 1 : -1;

    // parry / block
    if (mouse.rclick || pressed.KeyF) { player.parry = 0.22; }
    player.blockHeld = (mouse.right || keys.KeyF) && player.sta > 0;
    player.parry = Math.max(0, player.parry - dt);

    // dodge
    if ((pressed.ShiftLeft || pressed.ShiftRight) && player.dodge <= 0 && player.sta >= 22) { player.dodge = 0.3; player.iframe = 0.28; player.sta -= 22; player.staCd = 0.5; }
    let spd = speed(); if (player.dodge > 0) spd = 500; if (player.blockHeld) spd *= 0.45;
    const nx = player.x + (mx / l) * spd * dt, ny = player.y + (my / l) * spd * dt;
    if (isl.passable(nx, player.y)) player.x = clamp(nx, 20, MAP_W - 20);
    if (isl.passable(player.x, ny)) player.y = clamp(ny, 20, MAP_H - 20);

    if (mouse.clicked) doAttack(false);
    if (pressed.Space) doAttack(true);
    if (pressed.KeyQ) useSkill();
    if (pressed.Digit1) drinkEstus();
    if (pressed.Digit2) drinkMana();
    if (pressed.Digit3 || pressed.Digit4) useSkill();
    if (pressed.KeyE) interact();

    for (const t of ["atkCd", "iframe", "hurtCd", "staCd", "skillCd", "dodge"]) player[t] = Math.max(0, player[t] - dt);
    if (player.atk) { player.atk += dt * 4; if (player.atk >= 1) player.atk = 0; }
    if (player.staCd <= 0 && !player.blockHeld) player.sta = Math.min(maxSta(player), player.sta + 40 * dt);
    player.mana = Math.min(maxMana(player), player.mana + 3 * dt);
    trees.forEach((t) => { const d = dist(player.x, player.y, t.x, t.y); if (d < player.r + 9) { const a = Math.atan2(player.y - t.y, player.x - t.x); player.x = t.x + Math.cos(a) * (player.r + 9); player.y = t.y + Math.sin(a) * (player.r + 9); } });

    updateEnemies(dt); updateBosses(dt); updateProjs(dt); updateShocks(dt);
    particles.forEach((p) => { p.t -= dt; if (p.kind === "bit") { p.x += p.vx * dt; p.y += p.vy * dt; } else p.y += p.vy * dt; });
    particles = particles.filter((p) => p.t > 0);
    if (msgT > 0) msgT -= dt;
    if (player.hp <= 0) state = "dead";
    if (bosses.every((b) => !b.alive)) state = "win";
    cam.x = clamp(player.x - W / 2, 0, MAP_W - W); cam.y = clamp(player.y - H / 2, 0, MAP_H - H);
    const bl = bosses.filter((b) => b.alive).length;
    env.setHud(`${RACES[player.race].name} ${ROLES[player.role].name}  Souls ${player.souls}  Bosses ${bl}/8`);
  }

  function updateEnemies(dt) {
    enemies = enemies.filter((s) => !s.dead);
    enemies.forEach((s) => {
      if (s.stun > 0) { s.stun -= dt; return; }
      const d = dist(s.x, s.y, player.x, player.y); s.wob += dt * 3;
      const a = Math.atan2(player.y - s.y, player.x - s.x);
      if (d < 360) { s.dir = { x: Math.cos(a), y: Math.sin(a) }; s.face = Math.cos(a) >= 0 ? 1 : -1; s.walk += dt; } else s.walk = 0;
      s.atkCd = Math.max(0, s.atkCd - dt);
      if (s.ranged) { if (d < 380 && d > 90) { s.x -= Math.cos(a) * s.spd * 0.3 * dt; s.y -= Math.sin(a) * s.spd * 0.3 * dt; } else if (d >= 90) { s.x += Math.cos(a) * s.spd * dt; s.y += Math.sin(a) * s.spd * dt; } if (d < 400 && s.atkCd <= 0) { shootP(s, a, 240, s.dmg, "enemy", "#ff9e64", 5); s.atkCd = 1.6; } }
      else { if (d < 340) { s.x += Math.cos(a) * s.spd * dt; s.y += Math.sin(a) * s.spd * dt; } else { s.x += Math.cos(s.wob) * 16 * dt; s.y += Math.sin(s.wob * 0.7) * 16 * dt; } if (d < s.r + player.r + 4 && s.atkCd <= 0) { hurtPlayer(s.dmg, s); s.atkCd = 0.9; } }
    });
    if (enemies.length < 34) spawnEnemy();
  }

  // per-archetype boss movesets
  function updateBosses(dt) {
    bosses.forEach((b) => {
      if (!b.alive) return;
      const d = dist(b.x, b.y, player.x, player.y);
      if (!b.active) { if (d < 560) { b.active = true; say("⚔ " + b.name + " awakens!", 3); } else return; }
      if (b.stun > 0) { b.stun -= dt; return; }
      const a = Math.atan2(player.y - b.y, player.x - b.x);
      b.dirx = Math.cos(a); b.diry = Math.sin(a); b.atkCd -= dt; b.dmgCd = Math.max(0, b.dmgCd - dt); b.walk += dt;
      const move = (mult) => { b.x += b.dirx * b.spd * mult * dt; b.y += b.diry * b.spd * mult * dt; };
      const contact = (rad) => { if (d < b.r + player.r + rad && b.dmgCd <= 0) { hurtPlayer(b.dmg, b); b.dmgCd = 0.8; } };

      if (b.arch === "knight") {
        if (b.lunge > 0) { b.lunge -= dt; b.x += b.dirx * 340 * dt; b.y += b.diry * 340 * dt; contact(4); }
        else if (b.wind <= 0 && d > 52) move(1);
        if (d < 220 && b.atkCd <= 0 && b.wind <= 0 && b.lunge <= 0) b.wind = 0.5;
        if (b.wind > 0) { b.wind -= dt; if (b.wind <= 0) { b.lunge = 0.3; b.atkCd = 1.6; } }
        contact(6);
      } else if (b.arch === "dragon") {
        const pref = 260; if (d < pref - 40) move(-0.8); else if (d > pref + 60) move(0.9);
        if (b.atkCd <= 0) { if (b.phase % 2 === 0) { for (let k = -2; k <= 2; k++) shootP(b, a + k * 0.16, 260, b.dmg, "enemy", b.pcol, 7); } else { b.lunge = 0.3; } b.phase++; b.atkCd = 1.6; }
        if (b.lunge > 0) { b.lunge -= dt; b.x += b.dirx * 380 * dt; b.y += b.diry * 380 * dt; }
        contact(6);
      } else if (b.arch === "golem") {
        if (d > 70) move(1);
        if (d < 150 && b.atkCd <= 0) { shocks.push({ x: b.x, y: b.y, r: 20, maxr: 210, dmg: b.dmg, hit: false }); b.atkCd = 2.4; popText(b.x, b.y - 60, "SLAM!", "#ffd166"); }
        if (b.atkCd < 1.2 && b.atkCd > 1.1) shootP(b, a, 220, b.dmg, "enemy", "#9a9088", 9);
        contact(8);
      } else if (b.arch === "wraith") {
        b.tp -= dt; if (b.tp <= 0) { const ang = rand(0, 6.28); b.x = player.x + Math.cos(ang) * 200; b.y = player.y + Math.sin(ang) * 200; b.tp = 2.6; b.stun = 0.2; burst(b.x, b.y, b.col, 20); }
        if (b.atkCd <= 0) { for (let k = 0; k < 3; k++) shootP(b, a + rand(-0.3, 0.3), 200, b.dmg, "enemy", b.pcol, 6, { homing: 0.6, life: 3 }); b.atkCd = 1.8; }
        if (d > 120) move(0.5);
      } else if (b.arch === "hydra") {
        if (d > 80 && d < 500) move(0.5);
        if (b.atkCd <= 0) { if (b.phase % 3 === 2) { for (let k = 0; k < 2; k++) enemies.push({ type: "hollow", hp: 30, dmg: 8, spd: 90, souls: 8, x: b.x + rand(-30, 30), y: b.y + rand(-30, 30), r: 12, maxhp: 30, atkCd: .5, stun: 0, wob: 0, dir: { x: 1, y: 0 }, face: 1, walk: 0 }); popText(b.x, b.y - 60, "SPAWN!", b.col); } else { for (let k = -1; k <= 1; k++) shootP(b, a + k * 0.35, 240, b.dmg, "enemy", b.pcol, 7); } b.phase++; b.atkCd = 1.7; }
        contact(8);
      } else { // demon
        const pref = 200; if (d < pref - 40) move(-0.6); else if (d > pref + 40) move(1);
        if (b.atkCd <= 0) { if (b.phase % 2 === 0) { const n = b.id === 7 ? 12 : 8; for (let k = 0; k < n; k++) shootP(b, (k / n) * 6.28, 220, b.dmg, "enemy", b.pcol, 7); } else { b.lunge = 0.32; } b.phase++; b.atkCd = b.id === 7 ? 1.3 : 1.7; }
        if (b.lunge > 0) { b.lunge -= dt; b.x += b.dirx * 400 * dt; b.y += b.diry * 400 * dt; }
        contact(6);
      }
      b.x = clamp(b.x, 30, MAP_W - 30); b.y = clamp(b.y, 30, MAP_H - 30);
    });
  }

  function updateProjs(dt) {
    projs.forEach((p) => {
      if (p.homing && p.team === "enemy") { const a = Math.atan2(player.y - p.y, player.x - p.x); const sp = Math.hypot(p.vx, p.vy); const ca = Math.atan2(p.vy, p.vx); const na = ca + clamp(a - ca, -p.homing * dt * 3, p.homing * dt * 3); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.team === "player") {
        const explode = () => { if (!p.splash) return; enemies.forEach((e) => { if (dist(e.x, e.y, p.x, p.y) < p.splash) { e.hp -= p.dmg * 0.6; if (e.hp <= 0) { e.dead = true; player.souls += e.souls; } } }); bosses.forEach((b) => { if (b.alive && dist(b.x, b.y, p.x, p.y) < p.splash) { b.hp -= p.dmg * 0.6; if (b.hp <= 0) killBoss(b); } }); burst(p.x, p.y, p.color, 16); };
        let hitSomething = false;
        for (const e of enemies) if (dist(e.x, e.y, p.x, p.y) < e.r + p.r) { e.hp -= p.dmg; popText(e.x, e.y - e.r, "-" + (p.dmg | 0), "#fff"); if (e.hp <= 0) { e.dead = true; player.souls += e.souls; } p.life = 0; hitSomething = true; break; }
        if (!hitSomething) for (const b of bosses) if (b.alive && dist(b.x, b.y, p.x, p.y) < b.r + p.r) { b.hp -= p.dmg; popText(b.x, b.y - b.r, "-" + (p.dmg | 0), "#fff"); if (b.hp <= 0) killBoss(b); p.life = 0; hitSomething = true; break; }
        if (hitSomething) explode();
      } else { if (dist(p.x, p.y, player.x, player.y) < player.r + p.r) { hurtPlayer(p.dmg, null, p); if (p.team === "enemy") p.life = 0; } }
    });
    projs = projs.filter((p) => p.life > 0 && p.x > -60 && p.x < MAP_W + 60 && p.y > -60 && p.y < MAP_H + 60);
  }
  function updateShocks(dt) {
    shocks.forEach((s) => { s.r += 260 * dt; if (!s.hit && Math.abs(dist(player.x, player.y, s.x, s.y) - s.r) < 22 && player.iframe <= 0) { hurtPlayer(s.dmg, null); s.hit = true; } });
    shocks = shocks.filter((s) => s.r < s.maxr);
  }

  function updateRace() { const list = Object.keys(RACES); for (let i = 1; i <= 5; i++) if (pressed["Digit" + i]) { sel.race = list[i - 1]; state = "role"; return; } hoverBtn = -1; list.forEach((k, i) => { const x = 40 + i * 178, y = 180, w = 166, h = 300; if (mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + h) { hoverBtn = i; if (mouse.clicked) { sel.race = k; state = "role"; } } }); }
  function updateRole() { const list = Object.keys(ROLES); for (let i = 1; i <= 5; i++) if (pressed["Digit" + i]) { player = newPlayer(sel.race, list[i - 1]); startPlay(); return; } if (pressed.Escape) { state = "race"; return; } hoverBtn = -1; list.forEach((k, i) => { const x = 40 + i * 178, y = 180, w = 166, h = 300; if (mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + h) { hoverBtn = i; if (mouse.clicked) { player = newPlayer(sel.race, k); startPlay(); } } }); }

  function updateMenu(dt) {
    particles.forEach((p) => { p.t -= dt; }); particles = particles.filter((p) => p.t > 0); if (msgT > 0) msgT -= dt;
    if (sub === "bonfire") { if (pressed.KeyR) rest(); for (let i = 0; i < 7; i++) if (pressed["Digit" + (i + 1)]) levelUp(STAT_KEYS[i]); if (pressed.KeyE) sub = null; }
    else if (sub === "inv") { if (mouse.clicked) handleInvClick(); }
    else if (sub === "map") { if (mouse.clicked) handleMapClick(); }
  }

  // ---------- render ----------
  function render() {
    if (state === "race") return renderSelect("race");
    if (state === "role") return renderSelect("role");
    renderWorld();
    if (sub === "inv") renderInv(); else if (sub === "map") renderMap(); else if (sub === "bonfire") renderBonfire();
    if (state === "dead") { ctx.fillStyle = "rgba(30,0,0,.8)"; ctx.fillRect(0, 0, W, H); text(ctx, "YOU DIED", W / 2, H / 2 - 30, 56, "#c0392b", "center"); text(ctx, "Souls kept · Press SPACE / Click to rise", W / 2, H / 2 + 40, 15, "#8b949e", "center"); }
    if (state === "win") { ctx.fillStyle = "rgba(0,0,0,.85)"; ctx.fillRect(0, 0, W, H); text(ctx, "EMBERFALL CONQUERED", W / 2, H / 2 - 30, 34, "#ffd166", "center"); text(ctx, `All 8 bosses felled · ${RACES[player.race].name} ${ROLES[player.role].name}`, W / 2, H / 2 + 12, 15, "#fff", "center"); text(ctx, "Press SPACE / Click to play again", W / 2, H / 2 + 44, 15, "#8b949e", "center"); }
  }

  function renderWorld() {
    // terrain tiles
    const ox = Math.floor(cam.x / TS) * TS, oy = Math.floor(cam.y / TS) * TS;
    for (let wy = oy; wy < cam.y + H + TS; wy += TS) for (let wx = ox; wx < cam.x + W + TS; wx += TS) {
      const b = isl.biome(wx + TS / 2, wy + TS / 2);
      ctx.fillStyle = biomeColor(b, hash((wx / TS) | 0, (wy / TS) | 0));
      ctx.fillRect(wx - cam.x, wy - cam.y, TS + 1, TS + 1);
      if (b === "sand") { ctx.fillStyle = "#ffffff12"; ctx.fillRect(wx - cam.x, wy - cam.y, TS + 1, 3); }
    }
    // POIs
    pois.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; if (x < -50 || x > W + 50 || y < -50 || y > H + 50) return;
      if (p.type === "bonfire") { const fl = Math.sin(anim * 8 + p.x) * 2; obox(ctx, x - 8, y - 2, 16, 8, "#3a2a1a"); rectFill(ctx, x - 2, y - 14, 4, 12, "#5a3a22"); ctx.fillStyle = "#ff8c3a"; ctx.beginPath(); ctx.moveTo(x - 7, y - 8); ctx.quadraticCurveTo(x, y - 30 - fl, x + 7, y - 8); ctx.fill(); ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.moveTo(x - 3, y - 8); ctx.quadraticCurveTo(x, y - 22 - fl, x + 3, y - 8); ctx.fill(); }
      else if (p.type === "chest") { obox(ctx, x - 12, y - 8, 24, 16, p.opened ? "#4a3a2a" : "#8a5a2a"); rectFill(ctx, x - 12, y - 8, 24, 5, p.opened ? "#5a4a3a" : "#c98a3a"); rectFill(ctx, x - 2, y - 3, 4, 5, "#ffd166"); }
      else if (p.type === "boss") { const bb = bosses.find((z) => z.bid === p.bid); if (bb && bb.alive && !bb.active) text(ctx, "☠", x, y - 46, 22, "#ff5b5b", "center"); }
    });
    // trees
    trees.forEach((t) => { const x = t.x - cam.x, y = t.y - cam.y; if (x < -40 || x > W + 40 || y < -60 || y > H + 40) return; drawTree(x, y, t.k); });
    // shockwaves
    shocks.forEach((s) => { ctx.strokeStyle = "#ffd16688"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s.x - cam.x, s.y - cam.y, s.r, 0, 7); ctx.stroke(); ctx.lineWidth = 1; });
    // enemies
    enemies.forEach((s) => { const x = s.x - cam.x, y = s.y - cam.y; if (x < -30 || x > W + 30 || y < -40 || y > H + 30) return; drawEnemy(x, y, s); rectFill(ctx, x - 12, y - 30, 24, 3, "#400"); rectFill(ctx, x - 12, y - 30, 24 * clamp(s.hp / s.maxhp, 0, 1), 3, "#c33"); });
    // bosses
    bosses.forEach((bs) => { if (!bs.alive) return; const x = bs.x - cam.x, y = bs.y - cam.y; if (x < -120 || x > W + 120 || y < -140 || y > H + 120) return; drawBoss(x, y, bs); });
    // projectiles
    projs.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 7); ctx.fill(); ctx.fillStyle = "#ffffffaa"; ctx.beginPath(); ctx.arc(x - p.r * 0.3, y - p.r * 0.3, p.r * 0.4, 0, 7); ctx.fill(); });
    // player
    drawPlayer();
    // lighting
    const px = player.x - cam.x, py = player.y - cam.y;
    const grd = ctx.createRadialGradient(px, py, 80, px, py, 360); grd.addColorStop(0, "rgba(6,6,16,0)"); grd.addColorStop(1, "rgba(4,4,14,0.45)"); ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; pois.forEach((p) => { if (p.type !== "bonfire") return; const x = p.x - cam.x, y = p.y - cam.y; if (x < -80 || x > W + 80 || y < -80 || y > H + 80) return; const g = ctx.createRadialGradient(x, y - 10, 4, x, y - 10, 120); g.addColorStop(0, "rgba(255,150,60,.35)"); g.addColorStop(1, "rgba(255,150,60,0)"); ctx.fillStyle = g; ctx.fillRect(x - 120, y - 130, 240, 240); }); ctx.restore();
    // particles
    particles.forEach((p) => { const x = p.x - cam.x, y = p.y - cam.y; if (p.kind === "txt") text(ctx, p.str, x, y, 14, p.color, "center"); else rectFill(ctx, x - 2, y - 2, 4, 4, p.color); });
    drawHUD();
    if (msgT > 0) { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, W, 30); text(ctx, msg, W / 2, 8, 15, "#ffd166", "center"); }
  }

  function drawPlayer() {
    const px = player.x - cam.x, py = player.y - cam.y;
    if (player.dodge > 0) ctx.globalAlpha = 0.7;
    if (player.iframe > 0 && ((player.iframe * 20) | 0) % 2) ctx.globalAlpha = 0.4;
    const w = weapon(); const pal = { build: player.build, skin: player.skin, skinSh: player.skinSh, hair: player.hair, role: player.role, cloth: player.cloth, clothHi: player.clothHi, clothSh: player.clothSh, pants: player.pants, pantsSh: player.pantsSh, boot: "#2a2320", cape: player.cape, weapon: { type: w.type, color: w.color, big: w.big } };
    drawHumanoid(ctx, px, py, player.face, pal, 3, player.walk, { atk: player.atk, block: player.blockHeld });
    ctx.globalAlpha = 1;
    rectFill(ctx, px - 18, py - 34, 36, 4, "#400"); rectFill(ctx, px - 18, py - 34, 36 * clamp(player.hp / maxHp(player), 0, 1), 4, "#7ee787");
    const near = nearestPoi(); if (near) text(ctx, "[E] " + near.name, px, py + 24, 12, "#ffd166", "center");
  }

  function drawHUD() {
    // bars
    bar(16, H - 60, 240, player.hp / maxHp(player), "#c0392b", "HP " + (player.hp | 0));
    bar(16, H - 42, 240, player.sta / maxSta(player), "#2ecc71", "STA");
    bar(16, H - 24, 240, player.mana / Math.max(1, maxMana(player)), "#3a86ff", "MP");
    // hotbar (bottom center)
    const items = [{ n: player.estus, c: "#ff8c3a", l: "🔥" }, { n: player.mflask, c: "#3a86ff", l: "💧" }, { n: "Q", c: "#b57edc", l: "✦" }, { n: "", c: "#8a94a3", l: weapon().type[0].toUpperCase() }];
    const bw = 44, gap = 6, tot = items.length * (bw + gap) - gap, sx = W / 2 - tot / 2;
    items.forEach((it, i) => { const x = sx + i * (bw + gap), y = H - 56; rectFill(ctx, x, y, bw, 44, "#0d1117cc"); ctx.strokeStyle = "#30363d"; ctx.strokeRect(x, y, bw, 44); text(ctx, "" + (i + 1), x + 3, y + 2, 11, "#8b949e", "left"); text(ctx, it.l, x + bw / 2, y + 12, 18, it.c, "center"); if (it.n !== "") text(ctx, "" + it.n, x + bw - 4, y + 28, 12, "#fff", "right"); });
    // minimap top-right
    const mm = 120, mx = W - mm - 12, my = 12; ctx.fillStyle = "#0d1117cc"; ctx.fillRect(mx - 2, my - 2, mm + 4, mm + 4);
    for (let y = 0; y < mm; y += 3) for (let x = 0; x < mm; x += 3) { const b = isl.biome(x / mm * MAP_W, y / mm * MAP_H); ctx.fillStyle = biomeColor(b, 0.5); ctx.fillRect(mx + x, my + y, 3, 3); }
    ctx.fillStyle = "#7ee787"; ctx.fillRect(mx + player.x / MAP_W * mm - 1, my + player.y / MAP_H * mm - 1, 3, 3);
    bosses.forEach((b) => { if (b.alive) { ctx.fillStyle = "#ff4d4d"; ctx.fillRect(mx + b.x / MAP_W * mm - 1, my + b.y / MAP_H * mm - 1, 2, 2); } });
    ctx.strokeStyle = "#30363d"; ctx.strokeRect(mx, my, mm, mm);
    text(ctx, "M: full map", mx, my + mm + 2, 10, "#8b949e", "left");
  }
  function bar(x, y, w, frac, col, label) { rectFill(ctx, x, y, w, 14, "#000"); rectFill(ctx, x + 2, y + 2, (w - 4) * clamp(frac, 0, 1), 10, col); text(ctx, label, x + 6, y + 1, 10, "#fff", "left"); }
  function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); let r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255); return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }

  // ---------- sprites: enemies + distinct bosses ----------
  function drawEnemy(x, y, s) {
    const pals = {
      skeleton: { skin: "#e9edf0", skinSh: "#c7ccd0", hair: "#c7ccd0", cloth: "#d7dbde", clothHi: "#eef1f3", clothSh: "#b7bcc0", pants: "#b7bcc0", pantsSh: "#9aa0a6", boot: "#8a8f95", role: "generic", weapon: { type: "sword", color: "#aab0b6" } },
      hollow: { skin: "#9a8a6a", skinSh: "#7a6a4a", hair: "#3a2a1a", cloth: "#6a5238", clothHi: "#87683f", clothSh: "#4a3a28", pants: "#4a3a28", pantsSh: "#352a1c", boot: "#2a2018", role: "generic", weapon: { type: "sword", color: "#8a8f95" } },
      imp: { skin: "#c0504a", skinSh: "#8a332e", hair: "#3a1a16", cloth: "#a33f39", clothHi: "#c0504a", clothSh: "#6a2a26", pants: "#6a2a26", pantsSh: "#4a1e1a", boot: "#2a1210", role: "wizard", weapon: { type: "wand", color: "#ff7b3a" } },
      knight: { skin: "#e0a878", skinSh: "#c07a4a", hair: "#8a94a3", cloth: "#7a8494", clothHi: "#9aa4b4", clothSh: "#4a5260", pants: "#4a5260", pantsSh: "#353b45", boot: "#2a2320", role: "knight", weapon: { type: "sword", color: "#c9d1d9" } },
    };
    drawHumanoid(ctx, x, y, s.face || 1, pals[s.type], 2.4, s.walk, {});
  }

  function drawBoss(x, y, bs) {
    const wind = bs.wind > 0 || bs.lunge > 0;
    if (bs.arch === "knight") {
      const pal = { build: 1.5, skin: "#d0b090", skinSh: "#a07850", hair: bs.col, role: "knight", cloth: bs.col, clothHi: shade(bs.col, 30), clothSh: shade(bs.col, -30), pants: shade(bs.col, -20), pantsSh: shade(bs.col, -40), boot: "#2a2320", cape: "#5a1a1a", weapon: { type: "sword", color: shade(bs.col, 50), big: true } };
      drawHumanoid(ctx, x, y, bs.dirx < 0 ? -1 : 1, pal, 3.4, bs.walk, { atk: wind ? 0.5 : 0 });
    } else if (bs.arch === "dragon") drawDragon(x, y, bs);
    else if (bs.arch === "golem") drawGolem(x, y, bs);
    else if (bs.arch === "wraith") drawWraith(x, y, bs);
    else if (bs.arch === "hydra") drawHydra(x, y, bs);
    else drawDemon(x, y, bs);
    // hp bar + name
    rectFill(ctx, x - 44, y - 78, 88, 7, "#400"); rectFill(ctx, x - 44, y - 78, 88 * clamp(bs.hp / bs.maxhp, 0, 1), 7, "#ff4d4d");
    text(ctx, bs.name, x, y - 94, 13, "#fff", "center");
    if (wind) text(ctx, "!", x, y - 112, 22, "#ffd166", "center");
  }
  function bx(x, y, w, h, c) { ctx.fillStyle = "#0f0d16"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function drawDragon(x, y, bs) {
    const f = bs.dirx < 0 ? -1 : 1; ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, 34, 40, 8, 0, 0, 7); ctx.fill();
    const c = bs.col, hi = shade(c, 30), lo = shade(c, -35);
    // wings
    ctx.fillStyle = lo; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-54, -40 + Math.sin(bs.walk * 6) * 6); ctx.lineTo(-20, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(50, -34 + Math.sin(bs.walk * 6) * 6); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill();
    // body + tail
    bx(-24, 6, 48, 26, c); bx(-22, 6, 44, 6, hi);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(20, 12); ctx.lineTo(52, 30); ctx.lineTo(20, 26); ctx.fill();
    bx(-16, 30, 12, 8, lo); bx(4, 30, 12, 8, lo); // legs
    // neck + head
    bx(-30, -22, 12, 30, c); bx(-44, -34, 22, 16, c); bx(-46, -30, 6, 6, "#ffe36b"); // eye
    ctx.fillStyle = lo; ctx.beginPath(); ctx.moveTo(-30, -34); ctx.lineTo(-26, -46); ctx.lineTo(-22, -34); ctx.fill(); // horn
    if (bs.wind > 0 || bs.lunge > 0) { ctx.fillStyle = bs.pcol; ctx.beginPath(); ctx.arc(-50, -26, 6, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawGolem(x, y, bs) {
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x, y + 34, 38, 8, 0, 0, 7); ctx.fill();
    const c = bs.col, hi = shade(c, 24), lo = shade(c, -30), crack = "#ff8c3a";
    bx(x - 20, y - 4, 40, 40, c); bx(x - 20, y - 4, 40, 8, hi);          // torso
    bx(x - 30, y - 6, 12, 30, lo); bx(x + 18, y - 6, 12, 30, lo);        // arms
    bx(x - 28, y + 22, 12, 14, lo); bx(x + 16, y + 22, 12, 14, lo);      // fists
    bx(x - 14, y - 26, 28, 24, c); bx(x - 14, y - 26, 28, 6, hi);        // head
    bx(x - 8, y - 18, 5, 5, crack); bx(x + 3, y - 18, 5, 5, crack);      // glowing eyes
    ctx.strokeStyle = crack; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x + 2, y + 16); ctx.lineTo(x - 2, y + 28); ctx.stroke(); ctx.lineWidth = 1;
  }
  function drawWraith(x, y, bs) {
    const c = bs.col, lo = shade(c, -40); const fl = Math.sin(bs.walk * 4) * 4;
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.fillStyle = lo; ctx.beginPath(); ctx.moveTo(x - 22, y - 20 + fl); ctx.quadraticCurveTo(x, y + 40 + fl, x + 22, y - 20 + fl); ctx.quadraticCurveTo(x + 26, y - 44 + fl, x, y - 46 + fl); ctx.quadraticCurveTo(x - 26, y - 44 + fl, x - 22, y - 20 + fl); ctx.fill();
    // hood interior
    bx(x - 12, y - 40 + fl, 24, 22, "#0a0f14");
    ctx.fillStyle = "#bfeaff"; ctx.beginPath(); ctx.arc(x - 5, y - 28 + fl, 3, 0, 7); ctx.arc(x + 5, y - 28 + fl, 3, 0, 7); ctx.fill(); // eyes
    ctx.globalAlpha = 1; ctx.restore();
    ctx.fillStyle = c + "55"; ctx.beginPath(); ctx.arc(x, y - 20 + fl, 30, 0, 7); ctx.fill();
  }
  function drawHydra(x, y, bs) {
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x, y + 30, 42, 9, 0, 0, 7); ctx.fill();
    const c = bs.col, hi = shade(c, 26), lo = shade(c, -34);
    bx(x - 26, y + 2, 52, 30, c); bx(x - 26, y + 2, 52, 7, hi);         // body
    for (const nx of [-20, 0, 20]) { const sw = Math.sin(bs.walk * 3 + nx) * 4; bx(x + nx - 4, y - 30, 8, 34, lo); bx(x + nx - 8 + sw, y - 44, 16, 14, c); bx(x + nx - 5 + sw, y - 40, 4, 4, "#ffe36b"); } // 3 necks+heads
  }
  function drawDemon(x, y, bs) {
    const pal = { build: 1.6, skin: bs.col, skinSh: shade(bs.col, -30), hair: shade(bs.col, -20), role: "generic", cloth: shade(bs.col, -10), clothHi: shade(bs.col, 24), clothSh: shade(bs.col, -34), pants: shade(bs.col, -30), pantsSh: shade(bs.col, -46), boot: "#2a1614", weapon: { type: "axe", color: shade(bs.col, 40), big: true } };
    // wings behind
    ctx.fillStyle = shade(bs.col, -40); const f = bs.dirx < 0 ? -1 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.beginPath(); ctx.moveTo(6, -20); ctx.lineTo(46, -44 + Math.sin(bs.walk * 5) * 5); ctx.lineTo(20, 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(-46, -44 + Math.sin(bs.walk * 5) * 5); ctx.lineTo(-20, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    drawHumanoid(ctx, x, y, bs.dirx < 0 ? -1 : 1, pal, 3.6, bs.walk, { atk: (bs.lunge > 0) ? 0.5 : 0 });
    // horns
    ctx.fillStyle = shade(bs.col, -40); ctx.beginPath(); ctx.moveTo(x - 10, y - 36); ctx.lineTo(x - 16, y - 52); ctx.lineTo(x - 4, y - 40); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 10, y - 36); ctx.lineTo(x + 16, y - 52); ctx.lineTo(x + 4, y - 40); ctx.fill();
  }
  function drawTree(x, y, k) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 6, 14, 4, 0, 0, 7); ctx.fill();
    obox(ctx, x - 3, y - 6, 6, 16, "#4a3320");
    const cols = [["#2e6a3a", "#3f8a4e"], ["#245c31", "#357045"], ["#5a5a2e", "#7a7a3e"]][k % 3];
    for (const [r, dy] of [[18, -14], [14, -26], [9, -36]]) { ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x, y + dy, r, 0, 7); ctx.fill(); ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.arc(x - r * 0.3, y + dy - r * 0.3, r * 0.5, 0, 7); ctx.fill(); }
  }

  // ---------- screens ----------
  function renderSelect(kind) {
    rectFill(ctx, 0, 0, W, H, "#12141c");
    for (let i = 0; i < 70; i++) { const x = (hash(i, 1) * W) | 0, y = (hash(i, 2) * H) | 0; rectFill(ctx, x, y, 2, 2, "#232a36"); }
    const isRace = kind === "race";
    text(ctx, isRace ? "CHOOSE YOUR RACE" : "CHOOSE YOUR ROLE", W / 2, 56, 32, "#ffd166", "center");
    text(ctx, isRace ? "Each race grants buffs & weaknesses. Click or press 1-5." : `Race: ${RACES[sel.race].name}. Pick a role (moveset). Click or 1-5 · ESC back.`, W / 2, 100, 14, "#8b949e", "center");
    const list = Object.keys(isRace ? RACES : ROLES);
    list.forEach((k, i) => {
      const x = 40 + i * 178, y = 180, w = 166, h = 300, hov = hoverBtn === i;
      rectFill(ctx, x, y, w, h, hov ? "#232c3a" : "#1a2029"); ctx.strokeStyle = hov ? "#ffd166" : "#30363d"; ctx.lineWidth = hov ? 3 : 2; ctx.strokeRect(x, y, w, h); ctx.lineWidth = 1;
      if (isRace) { const R = RACES[k]; drawHumanoid(ctx, x + w / 2, y + 96, 1, { build: R.build, skin: R.skin, skinSh: R.skinSh, hair: "#6a5a4a", role: "generic", cloth: "#6a6a72", clothHi: "#8a8a92", clothSh: "#4a4a52", pants: "#4a4a52", pantsSh: "#35353d", boot: "#2a2320", weapon: { type: "sword", color: "#c9d1d9" } }, 3.4, anim * 1.5, {}); text(ctx, (i + 1) + ". " + R.name, x + w / 2, y + 150, 17, "#fff", "center"); wrap(R.note, x + 12, y + 178, w - 24, 12, "#9fb0c0"); }
      else { const J = ROLES[k]; drawHumanoid(ctx, x + w / 2, y + 96, 1, { build: RACES[sel.race].build, skin: RACES[sel.race].skin, skinSh: RACES[sel.race].skinSh, hair: J.hair, role: k, cloth: J.cloth, clothHi: J.clothHi, clothSh: J.clothSh, pants: J.pants, pantsSh: J.pantsSh, boot: "#2a2320", cape: J.cape, weapon: { type: WEAPONS[J.weapon].type, color: WEAPONS[J.weapon].color, big: WEAPONS[J.weapon].big } }, 3.4, anim * 1.5, { atk: 0.4 }); text(ctx, (i + 1) + ". " + J.name, x + w / 2, y + 150, 17, "#fff", "center"); text(ctx, "Weapon: " + WEAPONS[J.weapon].name, x + 12, y + 176, 11, "#c9d1d9", "left"); wrap(J.skill, x + 12, y + 196, w - 24, 11, "#7ee787"); }
    });
  }
  function wrap(str, x, y, maxw, size, color) { ctx.font = `bold ${size}px "Courier New", monospace`; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = color; const words = str.split(" "); let line = "", yy = y; for (const wd of words) { const test = line + wd + " "; if (ctx.measureText(test).width > maxw) { ctx.fillText(line, x, yy); line = wd + " "; yy += size + 3; } else line = test; } ctx.fillText(line, x, yy); }
  function panel() { ctx.fillStyle = "rgba(8,10,14,.93)"; ctx.fillRect(50, 50, W - 100, H - 100); ctx.strokeStyle = "#ffd166"; ctx.strokeRect(50, 50, W - 100, H - 100); }

  let invRegions = [];
  function handleInvClick() { for (const rg of invRegions) if (mouse.x > rg.x && mouse.x < rg.x + rg.w && mouse.y > rg.y && mouse.y < rg.y + rg.h) { rg.fn(); return; } }
  function renderInv() {
    panel(); invRegions = [];
    text(ctx, "INVENTORY & STATS  (I to close)", W / 2, 64, 18, "#ffd166", "center");
    let sy = 100; text(ctx, `${RACES[player.race].name} ${ROLES[player.role].name}`, 78, sy, 15, "#79c0ff", "left"); sy += 22;
    for (const s of STAT_KEYS) { text(ctx, `${STAT_NAME[s]}: ${player.stats[s]}` + (player.acc && ACCESSORIES[player.acc].stat === s ? ` (+${ACCESSORIES[player.acc].amt})` : ""), 78, sy, 13, "#c9d1d9", "left"); sy += 19; }
    sy += 4; text(ctx, `Light ${atkDmg(false)} · Heavy ${atkDmg(true)} · Def ${defense()}`, 78, sy, 12, "#ffd166", "left"); sy += 17;
    text(ctx, `HP ${maxHp(player)} STA ${maxSta(player)} MP ${maxMana(player)} Crit ${(critChance() * 100) | 0}%`, 78, sy, 12, "#8b949e", "left"); sy += 17;
    text(ctx, `Souls ${player.souls}` + (player.passive ? " · Passive: " + player.passive : ""), 78, sy, 12, "#8b949e", "left");
    const cx = 430; let cy = 100;
    text(ctx, "WEAPONS (click to equip)", cx, cy, 13, "#79c0ff", "left"); cy += 20;
    player.inv.weapons.forEach((wk) => { irow(cx, cy, `⚔ ${WEAPONS[wk].name}`, player.wKey === wk, () => { player.wKey = wk; say("Equipped " + WEAPONS[wk].name, 1.3); }); cy += 25; });
    cy += 6; text(ctx, "ARMOUR", cx, cy, 13, "#7ee787", "left"); cy += 20;
    player.inv.armours.forEach((ai) => { irow(cx, cy, `🛡 ${ARMOURS[ai].name} (def ${ARMOURS[ai].def})`, player.aIndex === ai, () => { player.aIndex = ai; say("Equipped " + ARMOURS[ai].name, 1.3); }); cy += 25; });
    cy += 6; text(ctx, "TRINKETS", cx, cy, 13, "#ffd166", "left"); cy += 20;
    if (!player.inv.accs.length) text(ctx, "(none found)", cx, cy, 12, "#586069", "left");
    player.inv.accs.forEach((ak) => { irow(cx, cy, `💍 ${ACCESSORIES[ak].name} (+${ACCESSORIES[ak].amt} ${ACCESSORIES[ak].stat})`, player.acc === ak, () => { player.acc = player.acc === ak ? null : ak; say("Toggled " + ACCESSORIES[ak].name, 1.3); }); cy += 25; });
  }
  function irow(x, y, label, on, fn) { const w = 460, hov = mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + 21; rectFill(ctx, x, y, w, 21, on ? "#1f5f7a" : hov ? "#2a3242" : "#1b2130"); text(ctx, label, x + 8, y + 4, 12, "#fff", "left"); if (on) text(ctx, "EQUIPPED", x + w - 8, y + 5, 11, "#7ee787", "right"); invRegions.push({ x, y, w, h: 21, fn }); }

  let mapRegions = [];
  function handleMapClick() { for (const rg of mapRegions) if (mouse.x > rg.x && mouse.x < rg.x + rg.w && mouse.y > rg.y && mouse.y < rg.y + rg.h) { player.x = rg.tx; player.y = rg.ty + 40; sub = null; say("Traveled to " + rg.name, 2.5); return; } }
  function renderMap() {
    panel(); mapRegions = [];
    text(ctx, "ISLE OF EMBERFALL — click a bonfire/boss to travel  (M to close)", W / 2, 62, 14, "#ffd166", "center");
    const mw = 420, mh = 420, mx = W / 2 - mw / 2, my = 96, sx = mw / MAP_W, sy = mh / MAP_H;
    for (let y = 0; y < mh; y += 2) for (let x = 0; x < mw; x += 2) { const b = isl.biome(x / sx, y / sy); ctx.fillStyle = biomeColor(b, hash(x, y)); ctx.fillRect(mx + x, my + y, 2, 2); }
    ctx.strokeStyle = "#30363d"; ctx.strokeRect(mx, my, mw, mh);
    pois.forEach((p) => { const x = mx + p.x * sx, y = my + p.y * sy; let c = "#8b949e", travel = false, label = "";
      if (p.type === "bonfire") { c = "#ff8c3a"; travel = true; label = p.name; }
      else if (p.type === "chest") { c = p.opened ? "#555" : "#ffd166"; }
      else if (p.type === "boss") { const bb = bosses.find((z) => z.bid === p.bid); c = bb && bb.alive ? "#ff4d4d" : "#3a3a3a"; travel = bb && bb.alive; label = p.name; }
      const hov = mouse.x > x - 7 && mouse.x < x + 7 && mouse.y > y - 7 && mouse.y < y + 7;
      rectFill(ctx, x - 4, y - 4, 8, 8, c);
      if (hov && label) { ctx.strokeStyle = "#fff"; ctx.strokeRect(x - 5, y - 5, 10, 10); text(ctx, label + (travel ? " ▶" : ""), x + 8, y - 6, 12, "#fff", "left"); }
      if (travel) mapRegions.push({ x: x - 7, y: y - 7, w: 14, h: 14, tx: p.x, ty: p.y, name: p.name });
    });
    ctx.fillStyle = "#7ee787"; ctx.fillRect(mx + player.x * sx - 3, my + player.y * sy - 3, 6, 6); text(ctx, "YOU", mx + player.x * sx + 8, my + player.y * sy - 6, 11, "#7ee787", "left");
  }
  function renderBonfire() {
    panel(); text(ctx, "BONFIRE", W / 2, 66, 28, "#ff8c3a", "center");
    text(ctx, `Souls ${player.souls}   ·   next level: ${levelCost()}`, W / 2, 104, 14, "#ffd166", "center");
    text(ctx, "[R] Rest — restore HP/MP/flasks, respawn enemies", W / 2, 136, 14, "#e6edf3", "center");
    let y = 172; STAT_KEYS.forEach((s, i) => { text(ctx, `[${i + 1}] ${STAT_NAME[s]}  (Lv ${player.stats[s]})`, W / 2, y, 15, "#9fb0c0", "center"); y += 28; });
    text(ctx, "[E] Leave", W / 2, y + 4, 13, "#8b949e", "center");
  }

  Arcade.games.boss = { title: "EMBERFALL", start, update, render, stop() {} };
})();
