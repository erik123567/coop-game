# Project context for Claude Code

## What this is
Two-player co-op platformer. One shared character: LEGS player (phone 1)
controls movement, ARMS player (phone 2) controls attacks. Both look at one
shared screen (the TV/laptop). Jackbox-style: TV and phones are all web pages,
no app install. Server only relays input; all game logic runs on the screen client.

## Files
- server/index.js   — Socket.io relay: room codes, role assignment, input forwarding. Auto-detects LAN IP.
- public/screen.html — The TV screen. Runs ALL physics/rendering. Levels are data objects in buildLevels().
- public/index.html  — Phone controller. Adapts layout to legs vs arms role.

## Controls
- LEGS: move joystick, jump→double jump, forward kick, side dash
- ARMS: aim joystick (drives shoot+punch direction), shoot, punch,
  thrust (only works mid-air AFTER legs initiates a jump — forced coordination)

## Game design (current)
- Core: combat + coordination. Arena rooms: clear all enemies to unlock the exit.
- Shared health bar (5 hearts), full refill on clearing a room, death retries current room.
- Enemies: walker (ground chaser), flyer (floats toward you), turret (stationary shooter).
- 3 levels in buildLevels(); Room 2 needs the jump+thrust combo to reach a high exit.

## Next tasks
1. Add a keyboard debug mode on screen.html so ONE person can drive both
   legs+arms from the TV keyboard (no phones) to test levels solo.
   Suggested: WASD+Space = legs, Arrows + F/G/H = arms.
2. Pull levels out of screen.html into their own levels.js file.
3. Later: split screen.html into modules; simple in-browser level editor.

## Known constraints
- Local-WiFi only right now (no remote play yet).
- Solo testing is hard (co-op needs 2 people) — hence the debug mode task.