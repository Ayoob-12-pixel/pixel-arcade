# 🕹️ Pixel Arcade

A single-page web app with a retro main menu and **four pixel games**, built in vanilla JavaScript + HTML5 Canvas — no frameworks, no build step.

**▶ Play it live:** _(GitHub Pages link appears here once published)_

## Games

| Game | What it is |
|------|------------|
| **Emberfall** | Full **2D pixel soulsbourne** on a **huge** procedurally-generated **island** (irregular coastline, beaches, forests, mountains, lakes — crossing on foot takes a while) with Terraria-style art & lighting. Choose a **race** (Human/Orc/Elf/Dwarf/Undead — buffs & weaknesses) **and** a **role** (Knight/Wizard/Archer/Rogue/Cleric). **7 stats**, mana & spells, **light + heavy attacks**, **parry** (RMB/F) & **dodge-roll**, hotbar, tons of loot (17 weapons, 7 armours, 8 trinkets). **Enterable POIs** — **dungeons** (fight enemies, loot chests) and **villages with a merchant** (buy gear for souls) — plus bonfires, chests, and **8 bosses each with a distinct design & moveset** (knight, dragon, golem, wraith, hydra, demon). Bosses guard their own area and won't all swarm you; leave and they return home & heal. **Island map** (M) to fast-travel. |
| **Battle Drop** | 2D battle royale on a **big island** (not a square) with **16 named POIs** you can **enter** (Lighthouse, Fishing Village, Bunker, Chapel, Docks…) — each an enterable building with a loot room, safe from the storm & bots. Everyone drops in with **nothing but bare fists** and must loot guns & shields. **Hotbar** of up to 3 weapons. Human-like bots loot up, take cover, react with delay, miss, keep distance, and flee when hurt. Full island **map** (M). Survive the shrinking storm. |
| **Fast Draw** | Cowboy shoot-out with **levels**. Wait for the bar to turn **RED**, then out-draw a rival whose reactions get **very fast** (down to ~85 ms). Win 3 duels to clear a level; from Lv2, fake **orange feints** bait early draws. **9 six-shooters** that **unlock as you level up**. |
| **Slap Rush** | Tap **SPACE** to gently nudge your bar and keep it inside the moving target band, filling your charge before your rival. Win the match and watch the **slap-down animation** — your giant hand swings in and smacks your rival silly. |

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
