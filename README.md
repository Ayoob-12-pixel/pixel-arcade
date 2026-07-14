# 🕹️ Pixel Arcade

A single-page web app with a retro main menu and **four pixel games**, built in vanilla JavaScript + HTML5 Canvas — no frameworks, no build step.

**▶ Play it live:** _(GitHub Pages link appears here once published)_

## Games

| Game | What it is |
|------|------------|
| **Emberfall** | Full **2D pixel soulsbourne** with Terraria-style art & lighting. Pick a **job** — Knight (guard), Wizard (fireball/ranged staff), Rogue (shadowstep), or Cleric (heal) — each with a unique skill and starting gear. **7 stats** (VIT/END/STR/DEX/INT/FTH/LCK), **mana & spells**, **stamina** + **dodge-roll**, equip **weapons / armour / trinkets** looted from chests, rest & level at **bonfires**, open the **map to fast-travel**, and fell **8 bosses** with distinct AI (melee, chargers, casters, summoners). |
| **Battle Drop** | 2D battle royale on a **big map**. You drop in with **nothing but a pickaxe** and must loot **5 gun types** + shields off the ground and off kills. Carry up to 3 weapons (switch 1/2/3 or Q, reload R). Bots play like humans — they start with a pickaxe too, loot up, patrol, take a beat to react, miss, keep their distance, reload, and flee when wounded. Survive the shrinking storm. |
| **Fast Draw** | Cowboy shoot-out with **levels**. Wait for the bar to turn **RED**, then out-draw a rival whose reactions get **very fast** (down to ~85 ms). Win 3 duels to clear a level; from Lv2, fake **orange feints** bait early draws. **9 six-shooters** that **unlock as you level up** and can be bought with duel winnings. |
| **Slap Rush** | Spam **SPACE** to keep your small bar inside the moving target band, filling your charge meter before your rival to land the slap. |

## Controls

- **Menu:** click a game card.
- **In-game:** `WASD` / arrows to move, `Mouse` to aim, `Click` / `SPACE` to attack/shoot/draw. `ESC` returns to the menu.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Structure

```
index.html      menu + game shell
styles.css      all styling
js/engine.js    shared input, game loop, helpers
js/main.js      menu routing & shared HUD/overlay
js/boss.js      Game 1 — Boss Island
js/fortnite.js  Game 2 — Battle Drop
js/cowboy.js    Game 3 — Fast Draw
js/slap.js      Game 4 — Slap Rush
```
