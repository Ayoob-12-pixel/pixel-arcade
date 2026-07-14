/* ============================================================
   GAME 4 — SLAP RUSH
   A moving TARGET band + your floating MARKER bar.
   Spam SPACE to keep your small bar inside the big band and
   fill your charge. Fill it before your rival to land the slap!
   ============================================================ */
(function () {
  const { clamp, rectFill, text, rand } = Arcade;
  const W = 960, H = 600;

  // channel geometry
  const CX = W / 2 - 40, CW = 80, CY = 90, CH = 420;

  let ctx, env, keys, pressed, mouse;
  let markerY, markerV, band, charge, oppCharge, oppSpeed;
  let playerHP, oppHP, round, over, shake, flashSlap, banner, bannerT;

  function reset(full) {
    if (full) { playerHP = 100; oppHP = 100; round = 1; over = null; }
    markerY = CY + CH / 2;
    markerV = 0;
    charge = 0; oppCharge = 0;
    oppSpeed = clamp(12 + round * 2.5, 12, 42); // %/sec, ramps each round
    band = { center: CY + CH / 2, h: clamp(150 - round * 8, 70, 150), dir: 1, spd: clamp(60 + round * 14, 60, 260) };
    shake = 0; flashSlap = 0;
    banner = round === 1 ? "SPAM SPACE to keep your bar in the yellow zone!" : `Round ${round} — rival is getting faster!`;
    bannerT = 2.5;
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    reset(true);
    env.setControls("<b>SPACE</b> (tap fast!) to lift your bar · keep it inside the yellow band · <b>ESC</b> menu");
    env.hideOverlay();
  }

  function landSlap(byPlayer) {
    flashSlap = 0.4; shake = 12;
    if (byPlayer) { const d = 16 + round * 2; oppHP -= d; banner = `SLAP! You smack the rival for ${d}!`; }
    else { const d = 12 + round; playerHP -= d; banner = `Rival slaps you for ${d}!`; }
    bannerT = 1.6;
    charge = 0; oppCharge = 0;
    if (playerHP <= 0) { over = "lose"; return; }
    if (oppHP <= 0) { over = "win"; return; }
    round++;
    // re-setup band difficulty but keep HP
    oppSpeed = clamp(12 + round * 2.5, 12, 44);
    band.h = clamp(150 - round * 8, 66, 150);
    band.spd = clamp(60 + round * 14, 60, 280);
  }

  function update(dt) {
    if (over) { if (pressed.Space || mouse.clicked) reset(true); return; }

    // marker physics
    markerV += 620 * dt;               // gravity down
    if (pressed.Space) markerV = -240;  // each tap = upward impulse
    if (mouse.clicked) markerV = -240;  // click works too (mobile)
    markerY += markerV * dt;
    if (markerY < CY + 12) { markerY = CY + 12; markerV = 0; }
    if (markerY > CY + CH - 12) { markerY = CY + CH - 12; markerV = 0; }

    // move target band
    band.center += band.dir * band.spd * dt;
    const half = band.h / 2;
    if (band.center - half < CY) { band.center = CY + half; band.dir = 1; }
    if (band.center + half > CY + CH) { band.center = CY + CH - half; band.dir = -1; }

    // in-zone check (marker bar is 24 tall)
    const inZone = Math.abs(markerY - band.center) < half - 4;
    if (inZone) charge = clamp(charge + 46 * dt, 0, 100);
    else charge = clamp(charge - 22 * dt, 0, 100);

    // opponent charges on a timer (their own rhythm)
    oppCharge = clamp(oppCharge + oppSpeed * dt, 0, 100);

    if (charge >= 100) landSlap(true);
    else if (oppCharge >= 100) landSlap(false);

    if (shake > 0) shake = Math.max(0, shake - 40 * dt);
    if (flashSlap > 0) flashSlap -= dt;
    if (bannerT > 0) bannerT -= dt;

    env.setHud(`Round ${round}   You ${Math.max(0, playerHP | 0)}HP   Rival ${Math.max(0, oppHP | 0)}HP`);
  }

  function drawFace(cx, cy, color, hp, hurt) {
    const s = shake > 0 ? rand(-shake, shake) : 0;
    cx += (hurt && flashSlap > 0 ? rand(-shake, shake) : 0) + (hp === "p" ? 0 : 0);
    rectFill(ctx, cx - 44 + s, cy - 44, 88, 88, color);
    rectFill(ctx, cx - 24 + s, cy - 16, 14, 16, "#000");
    rectFill(ctx, cx + 12 + s, cy - 16, 14, 16, "#000");
    rectFill(ctx, cx - 20 + s, cy + 20, 40, 8, "#000"); // mouth
    if (hurt && flashSlap > 0) { ctx.fillStyle = "rgba(255,60,60,.5)"; ctx.fillRect(cx - 44 + s, cy - 44, 88, 88); }
  }

  function render() {
    rectFill(ctx, 0, 0, W, H, "#241017");
    rectFill(ctx, 0, H - 90, W, 90, "#3a1a24");
    text(ctx, "👋 SLAP RUSH 👋", W / 2, 18, 22, "#ff7b9c", "center");

    // fighters
    const pHurt = flashSlap > 0 && banner.startsWith("Rival");
    const oHurt = flashSlap > 0 && banner.startsWith("SLAP");
    drawFace(150, 260, "#79c0ff", "p", pHurt);
    drawFace(W - 150, 260, "#c94f4f", "o", oHurt);
    text(ctx, "YOU", 150, 320, 15, "#79c0ff", "center");
    text(ctx, "RIVAL", W - 150, 320, 15, "#c94f4f", "center");
    // HP bars
    hpBar(70, 360, 160, playerHP, "#7ee787");
    hpBar(W - 230, 360, 160, oppHP, "#ff6b6b");

    // channel
    rectFill(ctx, CX - 4, CY - 4, CW + 8, CH + 8, "#000");
    rectFill(ctx, CX, CY, CW, CH, "#31121b");
    // target band
    const half = band.h / 2;
    rectFill(ctx, CX, band.center - half, CW, band.h, "rgba(255,209,102,.35)");
    rectFill(ctx, CX, band.center - half, CW, 3, "#ffd166");
    rectFill(ctx, CX, band.center + half - 3, CW, 3, "#ffd166");
    // marker (small bar)
    const inZone = Math.abs(markerY - band.center) < half - 4;
    rectFill(ctx, CX - 6, markerY - 12, CW + 12, 24, inZone ? "#7ee787" : "#ff7b9c");

    text(ctx, "TARGET", CX + CW / 2, CY - 26, 12, "#ffd166", "center");
    text(ctx, "your bar", CX + CW / 2, CY + CH + 8, 12, "#ff7b9c", "center");

    // charge meters
    text(ctx, "YOUR CHARGE", 70, 420, 13, "#8b949e", "left");
    chargeBar(70, 440, 260, charge, "#7ee787");
    text(ctx, "RIVAL CHARGE", W - 330, 420, 13, "#8b949e", "left");
    chargeBar(W - 330, 440, 260, oppCharge, "#ff6b6b");

    if (bannerT > 0) {
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 500, W, 34);
      text(ctx, banner, W / 2, 508, 16, "#ffd166", "center");
    }

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,.78)"; ctx.fillRect(0, 0, W, H);
      if (over === "win") { text(ctx, "KNOCKOUT! YOU WIN!", W / 2, H / 2 - 40, 40, "#7ee787", "center"); text(ctx, `Won in ${round - 1} slaps`, W / 2, H / 2 + 8, 16, "#fff", "center"); }
      else { text(ctx, "YOU GOT SLAPPED OUT", W / 2, H / 2 - 40, 34, "#ff4d4d", "center"); text(ctx, `Survived ${round - 1} rounds`, W / 2, H / 2 + 8, 16, "#fff", "center"); }
      text(ctx, "Press SPACE / Click to rematch", W / 2, H / 2 + 44, 15, "#8b949e", "center");
    }
  }

  function hpBar(x, y, w, hp, c) {
    rectFill(ctx, x, y, w, 16, "#000");
    rectFill(ctx, x + 2, y + 2, (w - 4) * clamp(hp / 100, 0, 1), 12, c);
  }
  function chargeBar(x, y, w, v, c) {
    rectFill(ctx, x, y, w, 22, "#111");
    rectFill(ctx, x + 2, y + 2, (w - 4) * clamp(v / 100, 0, 1), 18, c);
    ctx.strokeStyle = "#30363d"; ctx.strokeRect(x, y, w, 22);
  }

  Arcade.games.slap = { title: "SLAP RUSH", start, update, render, stop() {} };
})();
