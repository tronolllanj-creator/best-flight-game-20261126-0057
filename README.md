[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/tronolllanj-creator/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/tronolllanj-creator/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# AERIS: RIDGE RUNNER

An original 2D canvas pseudo-3D chase-view flight game. Fly a prop plane through mountain valleys, hit rings, manage fuel and damage, drop supplies, and land on a runway. Three missions with distinct conditions — dawn ring run, day canyon delivery, dusk storm rescue.

## How It Plays

Three sorties played in order:

1. **RING RUN (Dawn)** — 8 rings, 240 s time limit, fuel 100. Pass all rings before time expires. No landing required.
2. **CANYON DELIVERY (Day)** — 6 rings, drop zone at 5200 m, runway at 6400 m. Hit rings, press **E** over the drop zone to release the crate, then land on the runway.
3. **STORM RESCUE (Dusk Storm)** — 10 rings, 300 s time limit, seeded crosswind gusts up to 25 m/s, rain streaks, lightning flashes every 6–11 s, runway at 7200 m. Hit all rings and land.

Clearing a mission shows a score breakdown, then the next mission starts. Clearing mission 3 wins the game. Crashing ends the current mission — retry it, total score persists.

**Core mechanics:**
- Rings: cross a ring's distance with lateral offset < 70 m and altitude offset < 130 ft → +100 + time bonus, chime, burst particles.
- Fuel: drains 0.045 × (0.3 + throttle) per second. At 0, throttle forced to 0, plane glides.
- Damage: scrape terrain (descent ≤ 900 ft/min and speed ≤ 160 kts) → +25 damage, bounce, smoke. Damage 100 = crash. Hard impact (descent > 900 ft/min or speed > 160) → instant crash.
- Landing: at runway, speed < 95 kts and sink rate < 500 ft/min → +250 + fuel bonus. Otherwise crash.
- Supply drop: press **E** within drop zone while carrying crate → +150.

## Controls

| Key | Action |
|-----|--------|
| ↑ / W | Pitch up |
| ↓ / S | Pitch down |
| ← / A | Roll left |
| → / D | Roll right |
| W / S (held) | Throttle up / down |
| Space | Airbrake (−25 kts/s) |
| E | Drop crate (in drop zone) |
| Enter | Confirm / start mission |
| R | Restart current mission |
| P / Esc | Pause |
| M | Mute / unmute audio |

Pitch rate 25°/s, roll rate 60°/s, heading turns at roll × speed × 0.02°/s. Stall below 55 kts: nose drops 20°/s, altitude falls.

## Scoring

- Ring: +100 + round(timeLeft)
- Crate drop: +150
- Landing: +250 + round(fuel) × 2
- Scrape: −25 (damage)
- Crash: mission ends, retry, total score kept

Best score saved to `localStorage` (with try/catch). Tracks rings hit, drops, landings, crashes.

## Run Instructions

No build step. Static ES modules only.

```bash
# Serve the repo root (any static server)
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080` (or your server's URL). The game loads `main.ts` which boots the simulation and renderer.

**Screenshot staging** (for CI/preview):
- `?shot=start&seed=123` — title screen, plane on runway at dawn, 2 rings ahead
- `?shot=play&seed=123` — mission 1 mid-flight, banking through ring, HUD shows ALT 1240 ft SPD 132 kts HDG 042, fuel 78
- `?shot=rush&seed=123` — mission 3 storm, rain, lightning, low fuel 18, 7/10 rings
- `?shot=end&seed=123` — victory screen with breakdown (rings 24, drops 1, landings 2)

The `runShot()` function in `main.ts` stages a deterministic scene, paints twice, sets `window.__shotReady` and freezes the sim. Errors set `window.__shotError`.

## Technical Notes

- Fixed logical resolution 1280×720, renderer scales to window
- Fixed sim step 1/60 s
- Single seeded `mulberry32` RNG (`random.js`) drives ring placement, clouds, gusts — no `Date`, no `Math.random` in sim
- Object pools are plain arrays with swap-remove
- All modules are plain ES modules under `game/` (`main.ts` entry)
- No external libraries, no network, no build step
- Procedural WebAudio only (engine hum, wind, chimes, impacts, fanfares)
- Master gain 0.35
- Palette hexes defined in `config.js` and used in `render.js`
- State shape is identical across all modules (see spec)
- Events: `EVENT_RING`, `EVENT_CRASH`, `EVENT_LANDED`, `EVENT_MISSION`, `EVENT_WIN`, `EVENT_TIMEOUT`, `EVENT_DROP`
- Screens: `SCREEN_TITLE`, `SCREEN_PLAY`, `SCREEN_PAUSED`, `SCREEN_MISSION`, `SCREEN_WIN`, `SCREEN_CRASH`