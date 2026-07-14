/* ============================================================
   GAME 3 — FAST DRAW  (cowboy shoot-out)
   Wait... the bar turns RED -> DRAW! Shoot faster than your
   rival. Win cash, buy faster & deadlier six-shooters.
   ============================================================ */
(function () {
  const { rand, clamp, rectFill, text } = Arcade;
  const W = 960, H = 600;

  const GUNS = [
    { name: "Rusty Revolver", bonus: 0,   price: 0,   dmg: 1 },
    { name: "Quick Iron",     bonus: 45,  price: 60,  dmg: 1 },
    { name: "Peacemaker",     bonus: 90,  price: 160, dmg: 2 },
    { name: "Lightning .45",  bonus: 140, price: 320, dmg: 2 },
    { name: "The Widowmaker", bonus: 200, price: 600, dmg: 3 },
  ];

  let ctx, env, keys, pressed, mouse;
  let state, timer, waitFor, reactMs, oppMs, round, money, owned, gunIdx, resultTxt, resultGood;
  let flash, streak, shopBtns;

  function reset(full) {
    if (full) { money = 0; round = 1; owned = [true, false, false, false, false]; gunIdx = 0; streak = 0; }
    goReady();
  }

  function goReady() {
    state = "ready";
    timer = 0;
    waitFor = rand(1.4, 3.6);   // seconds before DRAW
    reactMs = null; oppMs = null; resultTxt = ""; flash = 0;
    // opponent reaction improves with round, with randomness
    oppReaction = clamp(560 - round * 22 + rand(-60, 60), 170, 700);
  }
  let oppReaction = 500;

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    reset(true);
    env.setControls("<b>SPACE</b> or <b>Click</b> to draw · buy guns in the shop between duels · <b>ESC</b> menu");
    env.hideOverlay();
    shopBtns = [];
  }

  function shoot() {
    const g = GUNS[gunIdx];
    if (state === "ready") {
      // false start
      state = "result"; resultGood = false; resultTxt = "TOO SOON! You drew before the signal."; streak = 0; flash = 0.3;
    } else if (state === "draw") {
      reactMs = Math.round(timer * 1000);
      const effective = reactMs - g.bonus; // gun bonus shaves off reaction
      oppMs = Math.round(oppReaction);
      state = "result"; flash = 0.35;
      if (effective <= oppMs) {
        resultGood = true; streak++;
        const reward = 20 + round * 8 + Math.max(0, (oppMs - effective) / 4 | 0) + streak * 5;
        money += reward;
        resultTxt = `HIT! You: ${reactMs}ms (−${g.bonus} gun = ${effective}) vs Rival ${oppMs}ms  ·  +$${reward}`;
        round++;
      } else {
        resultGood = false; streak = 0;
        resultTxt = `Rival was faster! You: ${effective}ms vs ${oppMs}ms`;
      }
    }
  }

  function update(dt) {
    const click = pressed.Space || mouse.clicked;

    if (state === "ready") {
      timer += dt;
      if (timer >= waitFor) { state = "draw"; timer = 0; flash = 0.15; }
      if (click) shoot();
    } else if (state === "draw") {
      timer += dt;
      // opponent auto-fires at their reaction time
      if (timer * 1000 >= oppReaction && reactMs === null) {
        // player didn't shoot in time -> rival wins
        reactMs = Math.round(timer * 1000);
        oppMs = Math.round(oppReaction);
        state = "result"; resultGood = false; streak = 0; flash = 0.35;
        resultTxt = `Too slow! Rival drew at ${oppMs}ms.`;
      } else if (click) shoot();
    } else if (state === "result") {
      if (click) { state = "shop"; buildShop(); }
    } else if (state === "shop") {
      // buy via number keys
      for (let i = 1; i <= 5; i++) if (pressed["Digit" + i]) tryBuy(i - 1);
      if (mouse.clicked) {
        for (const b of shopBtns) if (mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h) tryBuy(b.i);
      }
      if (keys.Enter || pressed.Space) { /* wait for explicit continue button */ }
    }

    if (flash > 0) flash -= dt;
    env.setHud(`Round ${round}   $${money}   Gun: ${GUNS[gunIdx].name}   Streak ${streak}`);
  }

  function buildShop() {
    shopBtns = [];
    const startY = 190, gap = 62;
    GUNS.forEach((g, i) => {
      shopBtns.push({ i, x: W / 2 - 260, y: startY + i * gap, w: 520, h: 52 });
    });
    // continue button
    shopBtns.push({ i: -1, x: W / 2 - 120, y: startY + GUNS.length * gap + 10, w: 240, h: 46, cont: true });
  }

  function tryBuy(i) {
    if (i === -1) { goReady(); return; }
    if (owned[i]) { gunIdx = i; return; }
    if (money >= GUNS[i].price) { money -= GUNS[i].price; owned[i] = true; gunIdx = i; }
  }

  function drawCowboy(x, ground, color, facing, firing) {
    // simple pixel cowboy
    rectFill(ctx, x - 16, ground - 70, 32, 44, color);        // body
    rectFill(ctx, x - 14, ground - 92, 28, 22, "#f2c79a");    // head
    rectFill(ctx, x - 22, ground - 96, 44, 8, "#4a3222");     // hat brim
    rectFill(ctx, x - 12, ground - 110, 24, 16, "#4a3222");   // hat top
    rectFill(ctx, x - 14, ground - 26, 12, 26, "#333");       // leg
    rectFill(ctx, x + 2, ground - 26, 12, 26, "#333");        // leg
    // arm + gun
    const gx = x + facing * 20;
    rectFill(ctx, x + facing * 8, ground - 62, facing * 16, 8, color);
    rectFill(ctx, gx, ground - 64, facing * 14, 6, "#222");
    if (firing) { rectFill(ctx, gx + facing * 14, ground - 66, facing * 12, 10, "#ffd166"); }
  }

  function render() {
    // saloon background
    let bg = "#3a2a1e";
    if (state === "draw") bg = "#7a1414";
    if (flash > 0 && state === "draw") bg = "#c21b1b";
    rectFill(ctx, 0, 0, W, H, bg);
    // floor
    rectFill(ctx, 0, H - 120, W, 120, "#5a3f28");
    for (let x = 0; x < W; x += 60) rectFill(ctx, x, H - 120, 4, 120, "#4a3320");
    // sky/wall band
    rectFill(ctx, 0, 0, W, 60, "#2a1d13");
    text(ctx, "🌵  SALOON DUEL  🌵", W / 2, 20, 22, "#e8c07d", "center");

    if (state === "shop") { renderShop(); return; }

    const ground = H - 120;
    const firingP = state === "result" && reactMs !== null && resultGood;
    const firingO = state === "result" && !resultGood;
    drawCowboy(240, ground, "#79c0ff", 1, firingP);           // player (faces right)
    drawCowboy(W - 240, ground, "#c94f4f", -1, firingO);      // rival (faces left)
    text(ctx, "YOU", 240, ground + 4, 14, "#79c0ff", "center");
    text(ctx, "RIVAL", W - 240, ground + 4, 14, "#c94f4f", "center");

    // center signal bar
    const bw = 300, bx = W / 2 - bw / 2, by = 120;
    rectFill(ctx, bx - 4, by - 4, bw + 8, 58, "#000");
    if (state === "ready") {
      rectFill(ctx, bx, by, bw, 50, "#333");
      text(ctx, "WAIT FOR IT...", W / 2, by + 15, 22, "#8b949e", "center");
    } else if (state === "draw") {
      rectFill(ctx, bx, by, bw, 50, "#ff2a2a");
      text(ctx, "DRAW!!!  SHOOT!", W / 2, by + 14, 24, "#fff", "center");
    } else if (state === "result") {
      rectFill(ctx, bx, by, bw, 50, resultGood ? "#1f7a3a" : "#444");
      text(ctx, resultGood ? "YOU WIN!" : "YOU LOSE", W / 2, by + 14, 24, "#fff", "center");
    }

    // instruction / result text
    if (state === "ready") text(ctx, "Don't draw early. Wait for the RED signal.", W / 2, 340, 16, "#e8c07d", "center");
    if (state === "result") {
      text(ctx, resultTxt, W / 2, 340, 15, "#fff", "center");
      text(ctx, "Click / SPACE to visit the shop", W / 2, 380, 15, "#8b949e", "center");
    }
    if (state === "draw") text(ctx, "NOW!", W / 2, 340, 30, "#fff", "center");
  }

  function renderShop() {
    text(ctx, "GUN SHOP", W / 2, 110, 34, "#ffd166", "center");
    text(ctx, `Cash: $${money}   ·   click or press number to buy/equip`, W / 2, 152, 15, "#e8c07d", "center");
    shopBtns.forEach((b) => {
      if (b.cont) {
        const hov = mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h;
        rectFill(ctx, b.x, b.y, b.w, b.h, hov ? "#2ea043" : "#1f7a3a");
        text(ctx, "NEXT DUEL ▶", b.x + b.w / 2, b.y + 14, 18, "#fff", "center");
        return;
      }
      const g = GUNS[b.i];
      const isOwned = owned[b.i], equipped = gunIdx === b.i;
      const hov = mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h;
      let col = "#21262d";
      if (equipped) col = "#1f5f7a"; else if (isOwned) col = "#30363d"; else if (hov) col = "#3a2f1a";
      rectFill(ctx, b.x, b.y, b.w, b.h, col);
      ctx.strokeStyle = equipped ? "#79c0ff" : "#30363d"; ctx.strokeRect(b.x, b.y, b.w, b.h);
      text(ctx, `${b.i + 1}. ${g.name}`, b.x + 14, b.y + 8, 17, "#fff", "left");
      text(ctx, `draw −${g.bonus}ms · dmg x${g.dmg}`, b.x + 14, b.y + 30, 13, "#8b949e", "left");
      let tag = equipped ? "EQUIPPED" : isOwned ? "OWNED (equip)" : `$${g.price}`;
      let tc = equipped ? "#79c0ff" : isOwned ? "#7ee787" : (money >= g.price ? "#ffd166" : "#ff6b6b");
      text(ctx, tag, b.x + b.w - 14, b.y + 16, 16, tc, "right");
    });
  }

  Arcade.games.cowboy = { title: "FAST DRAW", start, update, render, stop() {} };
})();
