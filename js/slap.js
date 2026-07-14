/* ============================================================
   GAME 4 — SLAP RUSH
   A moving TARGET band + your floating MARKER bar. Tap SPACE to
   nudge your bar (it moves gently now) and keep it inside the
   band to fill your charge before the rival. Win the match and
   watch the big slap-down animation!
   ============================================================ */
(function () {
  const { clamp, rectFill, text, rand } = Arcade;
  const W = 960, H = 600;
  const CX = W / 2 - 40, CW = 80, CY = 90, CH = 420;

  let ctx, env, keys, pressed, mouse;
  let markerY, markerV, band, charge, oppCharge, oppSpeed;
  let playerHP, oppHP, round, over, shake, flashSlap, banner, bannerT;
  let anim, slapT, slapWin;   // end-of-match animation

  function reset(full) {
    if (full) { playerHP = 100; oppHP = 100; round = 1; over = null; }
    markerY = CY + CH / 2; markerV = 0; charge = 0; oppCharge = 0;
    oppSpeed = clamp(11 + round * 2.2, 11, 40);
    band = { center: CY + CH / 2, h: clamp(150 - round * 7, 74, 150), dir: 1, spd: clamp(46 + round * 10, 46, 185) };
    shake = 0; flashSlap = 0; slapT = 0; slapWin = false; anim = 0;
    banner = round === 1 ? "Tap SPACE gently to keep your bar in the yellow zone!" : `Round ${round} — rival is getting faster!`;
    bannerT = 2.5;
  }

  function start(c, e) {
    ctx = c; env = e; keys = e.keys; pressed = e.pressed; mouse = e.mouse;
    reset(true);
    env.setControls("<b>SPACE</b> / <b>Click</b> to lift your bar (small nudges) · keep it in the yellow band · <b>ESC</b> menu");
    env.hideOverlay();
  }

  function landSlap(byPlayer) {
    flashSlap = 0.4; shake = 12;
    if (byPlayer) { const d = 16 + round * 2; oppHP -= d; banner = `SLAP! You smack the rival for ${d}!`; }
    else { const d = 12 + round; playerHP -= d; banner = `Rival slaps you for ${d}!`; }
    bannerT = 1.6; charge = 0; oppCharge = 0;
    if (playerHP <= 0) { over = "lose"; slapWin = false; slapT = 0; return; }
    if (oppHP <= 0) { over = "win"; slapWin = true; slapT = 0; return; }
    round++;
    oppSpeed = clamp(11 + round * 2.2, 11, 42);
    band.h = clamp(150 - round * 7, 70, 150);
    band.spd = clamp(46 + round * 10, 46, 200);
  }

  function update(dt) {
    anim += dt;
    if (over) { slapT += dt; if (slapT > 2.4 && (pressed.Space || mouse.clicked)) reset(true); if (shake > 0) shake -= 40 * dt; return; }

    // marker physics — gentler now (less gravity, smaller nudge)
    markerV += 360 * dt;
    if (pressed.Space) markerV = -150;
    if (mouse.clicked) markerV = -150;
    markerY += markerV * dt;
    if (markerY < CY + 12) { markerY = CY + 12; markerV = 0; }
    if (markerY > CY + CH - 12) { markerY = CY + CH - 12; markerV = 0; }

    band.center += band.dir * band.spd * dt;
    const half = band.h / 2;
    if (band.center - half < CY) { band.center = CY + half; band.dir = 1; }
    if (band.center + half > CY + CH) { band.center = CY + CH - half; band.dir = -1; }

    const inZone = Math.abs(markerY - band.center) < half - 4;
    if (inZone) charge = clamp(charge + 46 * dt, 0, 100); else charge = clamp(charge - 22 * dt, 0, 100);
    oppCharge = clamp(oppCharge + oppSpeed * dt, 0, 100);
    if (charge >= 100) landSlap(true); else if (oppCharge >= 100) landSlap(false);

    if (shake > 0) shake = Math.max(0, shake - 40 * dt);
    if (flashSlap > 0) flashSlap -= dt;
    if (bannerT > 0) bannerT -= dt;
    env.setHud(`Round ${round}   You ${Math.max(0, playerHP | 0)}HP   Rival ${Math.max(0, oppHP | 0)}HP`);
  }

  // rounder, less-blocky character
  function drawGuy(cx, cy, color, dark, tilt, mark) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt || 0);
    // body
    ctx.fillStyle = dark; ctx.fillRect(-30, 40, 60, 46);
    ctx.fillStyle = color; ctx.fillRect(-26, 40, 52, 42);
    // neck
    ctx.fillStyle = "#c98a5a"; ctx.fillRect(-8, 28, 16, 16);
    // head
    ctx.fillStyle = "#0f0d16"; ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 37, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.beginPath(); ctx.arc(-10, -12, 18, 0, 7); ctx.fill();
    // eyes
    const eo = mark ? 3 : 0;
    ctx.fillStyle = "#141018"; ctx.fillRect(-16, -8 + eo, 8, mark ? 3 : 9); ctx.fillRect(8, -8 + eo, 8, mark ? 3 : 9);
    // mouth
    ctx.fillStyle = "#5a1a1a"; if (mark) ctx.fillRect(-14, 16, 28, 10); else ctx.fillRect(-12, 16, 24, 6);
    // red hand-print if freshly slapped
    if (mark) { ctx.fillStyle = "rgba(255,60,60,.5)"; ctx.beginPath(); ctx.arc(18, 4, 16, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawHand(x, y, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = "#e8b48a"; ctx.strokeStyle = "#0f0d16"; ctx.lineWidth = 2;
    ctx.fillRect(-26, -22, 44, 40); ctx.strokeRect(-26, -22, 44, 40);   // palm
    for (let i = 0; i < 4; i++) { ctx.fillRect(-26 + i * 11, -38, 9, 18); ctx.strokeRect(-26 + i * 11, -38, 9, 18); } // fingers
    ctx.fillRect(16, -6, 16, 12); ctx.strokeRect(16, -6, 16, 12);       // thumb
    ctx.lineWidth = 1; ctx.restore();
  }

  function render() {
    rectFill(ctx, 0, 0, W, H, "#241017");
    rectFill(ctx, 0, H - 90, W, 90, "#3a1a24");
    text(ctx, "👋 SLAP RUSH 👋", W / 2, 18, 22, "#ff7b9c", "center");

    if (over) return renderFinish();

    const pHurt = flashSlap > 0 && banner.startsWith("Rival");
    const oHurt = flashSlap > 0 && banner.startsWith("SLAP");
    const ps = pHurt && shake > 0 ? rand(-shake, shake) : 0, os = oHurt && shake > 0 ? rand(-shake, shake) : 0;
    drawGuy(150 + ps, 250, "#79c0ff", "#3f6fa5", pHurt ? 0.15 : 0, pHurt && flashSlap > 0);
    drawGuy(W - 150 + os, 250, "#c94f4f", "#8a3335", oHurt ? -0.15 : 0, oHurt && flashSlap > 0);
    text(ctx, "YOU", 150, 330, 15, "#79c0ff", "center");
    text(ctx, "RIVAL", W - 150, 330, 15, "#c94f4f", "center");
    hpBar(70, 370, 160, playerHP, "#7ee787");
    hpBar(W - 230, 370, 160, oppHP, "#ff6b6b");

    rectFill(ctx, CX - 4, CY - 4, CW + 8, CH + 8, "#000");
    rectFill(ctx, CX, CY, CW, CH, "#31121b");
    const half = band.h / 2;
    rectFill(ctx, CX, band.center - half, CW, band.h, "rgba(255,209,102,.35)");
    rectFill(ctx, CX, band.center - half, CW, 3, "#ffd166");
    rectFill(ctx, CX, band.center + half - 3, CW, 3, "#ffd166");
    const inZone = Math.abs(markerY - band.center) < half - 4;
    rectFill(ctx, CX - 6, markerY - 12, CW + 12, 24, inZone ? "#7ee787" : "#ff7b9c");
    text(ctx, "TARGET", CX + CW / 2, CY - 26, 12, "#ffd166", "center");
    text(ctx, "your bar", CX + CW / 2, CY + CH + 8, 12, "#ff7b9c", "center");

    text(ctx, "YOUR CHARGE", 70, 430, 13, "#8b949e", "left");
    chargeBar(70, 450, 260, charge, "#7ee787");
    text(ctx, "RIVAL CHARGE", W - 330, 430, 13, "#8b949e", "left");
    chargeBar(W - 330, 450, 260, oppCharge, "#ff6b6b");

    if (bannerT > 0) { ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 500, W, 34); text(ctx, banner, W / 2, 508, 16, "#ffd166", "center"); }
  }

  function renderFinish() {
    // slap-down animation: winner's giant hand sweeps in and smacks the loser
    const t = clamp(slapT / 0.55, 0, 1);        // 0..1 swing
    const ease = t * t * (3 - 2 * t);
    const hit = slapT >= 0.55;
    const shakeAmt = hit && slapT < 1.0 ? rand(-10, 10) : 0;

    // both fighters; loser gets bopped after contact
    const loserTilt = hit ? clamp((slapT - 0.55) * 3, 0, 1) : 0;
    if (slapWin) {
      drawGuy(180, 250, "#79c0ff", "#3f6fa5", 0, false);
      drawGuy(W - 180 + shakeAmt, 250 + shakeAmt, "#c94f4f", "#8a3335", loserTilt * 0.6, hit);
      // hand sweeps from left toward rival
      const hx = 260 + ease * (W - 260 - 250), hy = 250 - Math.sin(ease * Math.PI) * 40;
      drawHand(hx, hy, 0.2 + ease * 0.3);
    } else {
      drawGuy(180 + shakeAmt, 250 + shakeAmt, "#79c0ff", "#3f6fa5", -loserTilt * 0.6, hit);
      drawGuy(W - 180, 250, "#c94f4f", "#8a3335", 0, false);
      const hx = (W - 260) - ease * (W - 260 - 250), hy = 250 - Math.sin(ease * Math.PI) * 40;
      ctx.save(); ctx.scale(-1, 1); ctx.translate(-W, 0); drawHand(W - hx, hy, 0.2 + ease * 0.3); ctx.restore();
    }
    if (hit && slapT < 1.1) {
      const lx = slapWin ? W - 180 : 180;
      text(ctx, "SLAP!!!", lx, 150, 48, "#ffd166", "center");
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + slapT; ctx.fillStyle = "#fff3b0"; ctx.fillRect(lx + Math.cos(a) * (30 + slapT * 60), 250 + Math.sin(a) * (30 + slapT * 60), 5, 5); }
    }
    if (slapT > 1.3) {
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, H / 2 - 70, W, 150);
      if (slapWin) { text(ctx, "KNOCKOUT! YOU WIN!", W / 2, H / 2 - 40, 40, "#7ee787", "center"); text(ctx, `Won in ${round - 1} slaps`, W / 2, H / 2 + 8, 16, "#fff", "center"); }
      else { text(ctx, "YOU GOT SLAPPED OUT", W / 2, H / 2 - 40, 34, "#ff4d4d", "center"); text(ctx, `Survived ${round - 1} rounds`, W / 2, H / 2 + 8, 16, "#fff", "center"); }
      if (slapT > 2.4) text(ctx, "Press SPACE / Click to rematch", W / 2, H / 2 + 44, 15, "#8b949e", "center");
    }
  }

  function hpBar(x, y, w, hp, c) { rectFill(ctx, x, y, w, 16, "#000"); rectFill(ctx, x + 2, y + 2, (w - 4) * clamp(hp / 100, 0, 1), 12, c); }
  function chargeBar(x, y, w, v, c) { rectFill(ctx, x, y, w, 22, "#111"); rectFill(ctx, x + 2, y + 2, (w - 4) * clamp(v / 100, 0, 1), 18, c); ctx.strokeStyle = "#30363d"; ctx.strokeRect(x, y, w, 22); }

  Arcade.games.slap = { title: "SLAP RUSH", start, update, render, stop() {} };
})();
