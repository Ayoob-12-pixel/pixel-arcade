/* ============================================================
   GAME 3 — FAST DRAW  (cowboy shoot-out, now with LEVELS)
   Wait for the bar to turn RED -> DRAW! Beat your rival's draw.
   Win 3 duels to clear a level. Every level the rival gets
   faster, the timing tighter, and (from Lv2) fake ORANGE feints
   try to bait an early draw. Buy faster guns between duels.
   ============================================================ */
(function () {
  const { rand, clamp, rectFill, text } = Arcade;
  const W = 960, H = 600;

  // bonus = ms shaved off your reaction · unlock = min level before you can buy it
  const GUNS = [
    { name: "Rusty Revolver",     bonus: 0,   price: 0,    dmg: 1, unlock: 1 },
    { name: "Quick Iron",         bonus: 50,  price: 80,   dmg: 1, unlock: 1 },
    { name: "Peacemaker",         bonus: 100, price: 190,  dmg: 2, unlock: 2 },
    { name: "Lightning .45",      bonus: 150, price: 360,  dmg: 2, unlock: 3 },
    { name: "Twin Colts",         bonus: 195, price: 560,  dmg: 3, unlock: 4 },
    { name: "Marshal's Repeater", bonus: 235, price: 780,  dmg: 3, unlock: 5 },
    { name: "Deadeye Special",    bonus: 275, price: 1050, dmg: 4, unlock: 6 },
    { name: "Gunslinger's Pride", bonus: 325, price: 1550, dmg: 4, unlock: 8 },
    { name: "The Widowmaker",     bonus: 385, price: 2300, dmg: 5, unlock: 10 },
  ];
  const WINS_PER_LEVEL = 3;

  let ctx, env, keys, pressed, mouse;
  let state, timer, waitFor, reactMs, oppMs, oppReaction;
  let level, wins, money, owned, gunIdx, resultTxt, resultGood, streak, flash;
  let feints, feintActive, shopBtns, banner, bannerT;

  function reset(full) {
    if (full) { money = 0; level = 1; wins = 0; owned = GUNS.map((g, i) => i === 0); gunIdx = 0; streak = 0; }
    goReady();
  }

  function difficulty() {
    // opponent is much faster now: lower base, lower floor, ramps hard with level & streak
    const floor = clamp(230 - level * 16, 85, 230);
    const base = 470 - level * 42 - streak * 14;
    oppReaction = clamp(base + rand(-40, 40), floor, 620);
  }

  function scheduleFeints() {
    feints = []; feintActive = 0;
    if (level < 2) return;
    const n = level >= 4 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      // feint fires somewhere in the wait, leaving a gap before the real draw
      feints.push(rand(0.5, Math.max(0.6, waitFor - 0.5)));
    }
    feints.sort((a, b) => a - b);
  }

  function goReady() {
    state = "ready"; timer = 0;
    waitFor = rand(1.3, 3.4);
    reactMs = null; oppMs = null; resultTxt = ""; flash = 0;
    difficulty(); scheduleFeints();
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    reset(true);
    env.setControls("<b>SPACE</b>/<b>Click</b> to draw · only shoot on <b>RED</b> (orange is a feint!) · buy guns in the shop · <b>ESC</b> menu");
    env.hideOverlay(); shopBtns = [];
  }

  function tooSoon(reason) {
    state = "result"; resultGood = false; streak = 0; flash = 0.3;
    resultTxt = reason;
  }

  function winDuel(reward) {
    money += reward; streak++; wins++;
    resultGood = true; flash = 0.35;
    if (wins >= WINS_PER_LEVEL) { wins = 0; level++; resultTxt += `  ·  LEVEL UP → Lv.${level}!`; }
  }

  function shoot() {
    const g = GUNS[gunIdx];
    if (state === "ready") { tooSoon("TOO SOON! You drew before the signal."); return; }
    if (state === "draw") {
      reactMs = Math.round(timer * 1000);
      const effective = reactMs - g.bonus;
      oppMs = Math.round(oppReaction);
      state = "result"; flash = 0.35;
      if (effective <= oppMs) {
        const reward = 18 + level * 10 + Math.max(0, (oppMs - effective) / 4 | 0) + streak * 4;
        resultTxt = `HIT! You ${reactMs}ms (−${g.bonus} = ${effective}) vs Rival ${oppMs}ms  ·  +$${reward}`;
        winDuel(reward);
      } else { resultTxt = `Rival was faster! You ${effective}ms vs ${oppMs}ms`; streak = 0; resultGood = false; }
    }
  }

  function update(dt) {
    const click = pressed.Space || mouse.clicked;

    if (state === "ready") {
      timer += dt;
      // trigger feints
      if (feintActive > 0) feintActive -= dt;
      for (let i = feints.length - 1; i >= 0; i--) if (timer >= feints[i]) { feintActive = 0.22; feints.splice(i, 1); }
      if (timer >= waitFor) { state = "draw"; timer = 0; flash = 0.15; }
      if (click) tooSoon(feintActive > 0 ? "BAITED! That was a feint (orange), not the draw." : "TOO SOON! You drew before the signal.");
    } else if (state === "draw") {
      timer += dt;
      if (timer * 1000 >= oppReaction && reactMs === null) {
        oppMs = Math.round(oppReaction); reactMs = Math.round(timer * 1000);
        tooSoon(`Too slow! Rival drew at ${oppMs}ms.`);
      } else if (click) shoot();
    } else if (state === "result") {
      if (click) { state = "shop"; buildShop(); }
    } else if (state === "shop") {
      for (let i = 1; i <= 9; i++) if (pressed["Digit" + i]) tryBuy(i - 1);
      if (mouse.clicked) for (const b of shopBtns) if (hit(b)) tryBuy(b.i);
    }

    if (flash > 0) flash -= dt;
    env.setHud(`LEVEL ${level}   Duels ${wins}/${WINS_PER_LEVEL}   $${money}   ${GUNS[gunIdx].name}   Streak ${streak}`);
  }

  function hit(b) { return mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h; }

  function buildShop() {
    shopBtns = []; const startY = 150, gap = 44;
    GUNS.forEach((g, i) => shopBtns.push({ i, x: W / 2 - 270, y: startY + i * gap, w: 540, h: 40 }));
    shopBtns.push({ i: -1, x: W / 2 - 120, y: startY + GUNS.length * gap + 4, w: 240, h: 36, cont: true });
  }
  function tryBuy(i) {
    if (i === -1) { goReady(); return; }
    if (owned[i]) { gunIdx = i; return; }
    if (level < GUNS[i].unlock) return;                 // still locked
    if (money >= GUNS[i].price) { money -= GUNS[i].price; owned[i] = true; gunIdx = i; }
  }

  function drawCowboy(x, ground, color, facing, firing) {
    rectFill(ctx, x - 16, ground - 70, 32, 44, color);
    rectFill(ctx, x - 14, ground - 92, 28, 22, "#f2c79a");
    rectFill(ctx, x - 22, ground - 96, 44, 8, "#4a3222");
    rectFill(ctx, x - 12, ground - 110, 24, 16, "#4a3222");
    rectFill(ctx, x - 14, ground - 26, 12, 26, "#333");
    rectFill(ctx, x + 2, ground - 26, 12, 26, "#333");
    rectFill(ctx, x + facing * 8, ground - 62, facing * 16, 8, color);
    const gx = x + facing * 20;
    rectFill(ctx, gx, ground - 64, facing * 14, 6, "#222");
    if (firing) rectFill(ctx, gx + facing * 14, ground - 66, facing * 12, 10, "#ffd166");
  }

  function render() {
    let bg = "#3a2a1e";
    if (state === "ready" && feintActive > 0) bg = "#a8641e";       // orange feint
    if (state === "draw") bg = flash > 0 ? "#c21b1b" : "#7a1414";    // red draw
    rectFill(ctx, 0, 0, W, H, bg);
    rectFill(ctx, 0, H - 120, W, 120, "#5a3f28");
    for (let x = 0; x < W; x += 60) rectFill(ctx, x, H - 120, 4, 120, "#4a3320");
    rectFill(ctx, 0, 0, W, 60, "#2a1d13");
    text(ctx, `🌵  SALOON DUEL — LEVEL ${level}  🌵`, W / 2, 20, 22, "#e8c07d", "center");

    if (state === "shop") return renderShop();

    const ground = H - 120;
    drawCowboy(240, ground, "#79c0ff", 1, state === "result" && resultGood);
    drawCowboy(W - 240, ground, "#c94f4f", -1, state === "result" && !resultGood);
    text(ctx, "YOU", 240, ground + 4, 14, "#79c0ff", "center");
    text(ctx, "RIVAL", W - 240, ground + 4, 14, "#c94f4f", "center");

    const bw = 320, bx = W / 2 - bw / 2, by = 120;
    rectFill(ctx, bx - 4, by - 4, bw + 8, 58, "#000");
    if (state === "ready") {
      if (feintActive > 0) { rectFill(ctx, bx, by, bw, 50, "#ff8c1a"); text(ctx, "FEINT — HOLD!", W / 2, by + 14, 22, "#3a1a00", "center"); }
      else { rectFill(ctx, bx, by, bw, 50, "#333"); text(ctx, "WAIT FOR RED...", W / 2, by + 15, 20, "#8b949e", "center"); }
    } else if (state === "draw") { rectFill(ctx, bx, by, bw, 50, "#ff2a2a"); text(ctx, "DRAW!!!  SHOOT!", W / 2, by + 14, 24, "#fff", "center"); }
    else if (state === "result") { rectFill(ctx, bx, by, bw, 50, resultGood ? "#1f7a3a" : "#444"); text(ctx, resultGood ? "YOU WIN!" : "YOU LOSE", W / 2, by + 14, 24, "#fff", "center"); }

    if (state === "ready") text(ctx, level >= 2 ? "Beware orange feints — only draw on RED." : "Don't draw early. Wait for the RED signal.", W / 2, 330, 16, "#e8c07d", "center");
    if (state === "draw") text(ctx, "NOW!", W / 2, 330, 30, "#fff", "center");
    if (state === "result") { text(ctx, resultTxt, W / 2, 330, 15, "#fff", "center"); text(ctx, "Click / SPACE for the shop", W / 2, 372, 15, "#8b949e", "center"); }
    text(ctx, `Rival reaction ≈ ${Math.round(oppReaction)}ms`, W / 2, H - 150, 12, "#8b949e", "center");
  }

  function renderShop() {
    text(ctx, "GUN SHOP", W / 2, 96, 28, "#ffd166", "center");
    text(ctx, `Cash $${money}  ·  Level ${level}  ·  click or press 1-9 to buy/equip · guns UNLOCK as you level up`, W / 2, 130, 13, "#e8c07d", "center");
    shopBtns.forEach((b) => {
      const hov = hit(b);
      if (b.cont) { rectFill(ctx, b.x, b.y, b.w, b.h, hov ? "#2ea043" : "#1f7a3a"); text(ctx, "NEXT DUEL ▶", b.x + b.w / 2, b.y + 10, 17, "#fff", "center"); return; }
      const g = GUNS[b.i], isOwned = owned[b.i], equipped = gunIdx === b.i, locked = level < g.unlock;
      let col = "#21262d"; if (equipped) col = "#1f5f7a"; else if (isOwned) col = "#30363d"; else if (locked) col = "#1a1a1f"; else if (hov) col = "#3a2f1a";
      rectFill(ctx, b.x, b.y, b.w, b.h, col);
      ctx.strokeStyle = equipped ? "#79c0ff" : "#30363d"; ctx.strokeRect(b.x, b.y, b.w, b.h);
      const nameCol = locked ? "#5a6068" : "#fff";
      text(ctx, `${b.i + 1}. ${g.name}`, b.x + 12, b.y + 5, 15, nameCol, "left");
      text(ctx, `draw −${g.bonus}ms · dmg x${g.dmg}`, b.x + 12, b.y + 23, 12, "#8b949e", "left");
      let tag, tc;
      if (equipped) { tag = "EQUIPPED"; tc = "#79c0ff"; }
      else if (isOwned) { tag = "OWNED (equip)"; tc = "#7ee787"; }
      else if (locked) { tag = "🔒 Lv " + g.unlock; tc = "#8b949e"; }
      else { tag = "$" + g.price; tc = money >= g.price ? "#ffd166" : "#ff6b6b"; }
      text(ctx, tag, b.x + b.w - 12, b.y + 12, 15, tc, "right");
    });
  }

  Arcade.games.cowboy = { title: "FAST DRAW", start, update, render, stop() {} };
})();
