# 🕹️ Pixel Arcade

A single-page web app with a retro main menu and **four pixel games**, built in vanilla JavaScript + HTML5 Canvas — no frameworks, no build step.

**▶ Play it live:** _(GitHub Pages link appears here once published)_

## Games

| Game | What it is |
|------|------------|
| **Boss Island** | Open-world pixel island. Roam, kill slimes for XP & loot, collect Power Orbs, and hunt down 3 bosses. Level up to grow stronger. |
| **Battle Drop** | 2D battle royale. Loot weapons & shields off the ground, mouse-aim and shoot the bots, and survive the shrinking storm for a Victory Royale. |
| **Fast Draw** | Cowboy shoot-out. Wait for the bar to turn **RED**, then draw faster than your rival. Win cash and buy faster, deadlier six-shooters. |
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
