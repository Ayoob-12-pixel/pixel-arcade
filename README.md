# 🕹️ Pixel Arcade

A single-page web app with a retro main menu and **four pixel games**, built in vanilla JavaScript + HTML5 Canvas — no frameworks, no build step.

**▶ Play it live:** _(GitHub Pages link appears here once published)_

## Games

| Game | What it is |
|------|------------|
| **Ashen Isle** | Pixel **soulslike**. Choose a race (Human / Orc / Elf / Undead), each with its own pros & cons. Explore an open island of POIs, loot chests for **armour & weapons** you can equip, manage **stamina**, **dodge-roll** with i-frames, rest at **bonfires**, spend **souls** to level up your stats, and fell 3 great bosses. Full **inventory** (I) and **map** (M). |
| **Battle Drop** | 2D battle royale. Carry **up to 3 weapons** and switch between them (1/2/3 or Q). The bots play like humans — they patrol, take a beat to react when they spot you, miss, keep their distance, reload, and flee when wounded. Survive the shrinking storm for a Victory Royale. |
| **Fast Draw** | Cowboy shoot-out with **levels**. Wait for the bar to turn **RED**, then out-draw your rival. Win 3 duels to clear a level; every level the rival gets faster, timing tightens, and (from Lv2) fake **orange feints** try to bait an early draw. Buy faster, deadlier six-shooters. |
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
