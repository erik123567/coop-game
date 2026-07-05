# Project context for Claude Code

## Name / branding
Title: **SPLIT UNIT** (co-op mech brawler). Wordmark is a hard blue→red gradient seam
(SPLIT = Legs-blue, UNIT = Arms-red) using background-clip:text, reused as `.wordmark`
(title), `.suMark` (mini: galaxy corner + death overlay), and `.brand` on the phone join
screen. Title screen (#lobby in screen.html) = two-column: an animated split-colored hero
mech SVG + wordmark on the left, join card (code/QR/roster/Start) on the right, over a
starfield. The in-game `drawPlayer` sprite shares the identity (Legs-blue legs, Arms-red
chest/arms, cyan visor, yellow V-fin, glowing accent reactor-core hexagon on the chest).

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
- KEYBOARD DEBUG (screen.html, no phones needed): press Enter (or click Start)
  in the lobby to play solo. LEGS = A/D move, Space jump, W kick, S dash.
  ARMS = arrows aim, F shoot, G punch, H thrust. Keys feed the same input
  objects the phones do, so game logic is untouched. On-screen legend at
  bottom-left. Start button is always enabled to allow solo starts.

## Art direction: SPACE + Gundam-style mecha (screen.html, all procedural — no asset files)
- Theme is deep-space; palette in :root (space vars: --metal, --visor cyan, --engine, --star, --hull-edge).
- drawPlayer() = angular mecha: metal armor, cyan visor eye, gold V-fin antenna, red chest
  V-panel + cockpit core (arms player), blue armored legs/boots (legs player). Poses: walk
  cycle, air tuck, kick extend + energy slash, aim arm w/ beam muzzle, triple thrust flames,
  squash & stretch. Anim state on player: animPhase (walk), blink/blinkT (advanced in update()).
- drawParallax(): nebula gradients + 3-layer twinkling starfield + ringed planet + station-truss
  silhouettes with window lights; plus a vignette. Uses hsh(n) for stable star positions.
- Platforms = metallic hull (lit top edge, panel seams, rivet lights). Exit = warp gate
  (pulsing rings when active / powered-down when locked). Enemies get a subtle idle bob.
- Two-player identity preserved throughout: blue = Legs player, red = Arms player.

## Worlds / biomes (each level = a planet you land on)
- Every level has a `world` key → THEMES[key]. applyTheme() (called in loadLevel) overrides
  CSS palette vars (--bg/--ground/--hull-edge/--accent…) so the whole scene reskins, and sets
  `worldTheme` used by drawParallax()/drawSilhouettes() (nebula colors, planet, star tint,
  terrain shape: towers/spires/peaks/crystals, fog).
- Current worlds: kepler (tech/blue), verdant (alien jungle/green), cinder (volcanic/red),
  glacius (ice/cyan). Mech hero colors stay constant across worlds for identity.
- Roadmap for this arc: (done) worlds + first alien; (done) coins + upgrade shop;
  (next) more aliens/drone reskins per world; (later) galaxy-map world select + story.

## Meta-progression: coins + upgrade shop (saved to localStorage, key 'coopMechSave_v1')
- save = { coins, up:{hull,weapons,thrusters,shield} }; persist() writes it on any change.
- Enemies drop coins on death (COIN_VALUE by type). Coins magnet to the player + settle on
  platforms; collecting banks them (save.coins) → #coinHud. Coins persist across deaths/sessions.
- UPGRADES table (hull/weapons/thrusters/shield/reactor, each with cost[] arrays). computeStats()
  derives `stats` {maxHealth, dmg, jump, thrust, shieldDrain, shieldRegen, energyMax, energyRegen,
  armorTier}, used at call sites in place of the old MAX_HEALTH/JUMP_VELOCITY/THRUST_FORCE/damage/
  shield/ENERGY_MAX/ENERGY_REGEN constants (those remain as base values). Reactor → +40 energyMax
  & +25% regen per level.
- Shop (#shop overlay) opens between worlds on reaching the warp gate (state='shop' pauses update).
  renderShop()/buyUpgrade(); "Launch to next world" runs the stored continue callback → loadLevel(next).
- Hull tier shows on the mech (TIER trim color + shoulder spike + chest emblem in drawPlayer).

## Legs movement in boss fights (universal layer)
- DASH = DODGE: damagePlayer() early-returns while player.dashT>0 (brief i-frames). Dash through boss
  slams/charges/beams. Costs energy + has DASH_CD, so not spammable.
- Dash-ram AND uppercut now DAMAGE the boss (route to hurtBoss), once per swing via per-attack ids:
  p.dashId / p.kickId incremented on fire; enemies+boss track lastDashHit/lastKickHit so a swing hits
  each target once (this also enabled JUGGLING — re-kick airborne enemies; the old launchT<=0 guard was dropped).
- Respects boss armor: dash/kick clang on Warden when not vulnerable, do nothing to combo-only Forge,
  light a Progenitor core when overlapped. Loop for Legs vs bosses: dash-dodge in → dash-ram/uppercut the
  exposed core → dash out. NEXT (per-boss set-pieces): Warden shockwave-dash, Forge charge-dodge.
- BLOOM WALL-CLIMB (done): on activation, Bloom pushes two `vine:true` platforms (climbable walls) to
  level.platforms forming a shaft around its high core, so Legs wall-jumps up to melee the core (free —
  the answer when leeches drain thrust energy). Vines drawn green in the platform loop; not removed on
  death (near spawn, don't block the exit path). Bloom hp 24->30 since both players can now damage it.

## Bosses (framework + Warden Prime)
- A level may declare `boss:{type,x}`. loadLevel → makeBoss(); `boss` global (null if none). Boss
  stays 'dormant' until the room's mobs are cleared, then activateBoss() (banner + sound). Sector
  isn't clear until boss.dead: cleared = enemiesLeft()===0 && (!boss || boss.dead).
- Phase machine in updateBoss(): intro→idle(stalk)→windup(telegraph: arms up + red flash)→slam→
  recover(core exposed, `vulnerable`=true). damageBoss() clangs (no dmg) unless vulnerable. Player
  attacks reach it via hurtBoss() (kick/punch), a bullet-vs-boss check, and a combo radius check.
- Warden Prime (Sector 1): SHIELD or JUMP the slam (wardenSlam damages only if grounded+near;
  shield blocks via damagePlayer), then hit the cyan core during recovery. killBoss() → explosion +
  22 salvage coins. Boss HP bar drawn top-center; drawBoss() renders in world space.
- ALL FOUR BOSSES BUILT (one per sector) on the shared framework — makeBoss/updateBoss/drawBoss
  dispatch by type; damageBoss(amount,isCombo) with flags needsVulnerable / comboOnly:
  1 Warden (S1): shield/jump the slam, hit core in recovery (needsVulnerable).
  2 Bloom Mother (S2): rooted, HIGH core (aim/thrust up), spawns energy-leeches + spore volleys; armorless.
  3 Forgemaster (S3): comboOnly — only Combo cracks it; jump the pound, shield the charge.
  4 Progenitor (S4): two cores (coreCenter/coreRect), light BOTH within ~0.9s → sync detonation (-4);
     combo lights both at once; hits route via hurtBoss()/bullet/combo → progenitorCoreHit(). Beam = shield/dodge.
  killBoss() clears adds + drops 26 coins. Next: real 2-player playtest, or per-boss intro stingers.

## Story (lightweight) — see the campaign framing
- Premise: a hive-mind "the Progenitor" assimilates machines AND organisms (unifies drones/mechs/
  aliens as one faction). You pilot the two-mind TANDEM frame (Legs=chassis, Arms=weapons) on a
  single reactor core (= shared energy). Salvage downed foes → Hangar upgrades. Finale: it tries to
  split the two pilots. Each level has an `intro` briefing line shown on a card before deploy.

## Timed battle arenas (level.timeLimit)
- A level with `timeLimit` (seconds) becomes a timed arena: roomTimer counts down (loadLevel sets it),
  shown in #timerHud (M:SS, red-pulse <10s, "CLEAR!" when done). Runs only while NOT cleared.
- Timeout (roomTimer hits 0 before clear) → run.death='timeout' → death overlay ("TIME'S UP" + blame
  verdict "hit the rifts first"). Clearing in time → "✓ ARENA CLEARED" banner, ~1.4s celebration
  (clearDelay), then completeSector() (no exit walk needed — clearing = done).
- completeSector() extracted (save.cleared + maxWorld + shop→map); used by both timed clear and normal
  exit-reach. 3 arenas appended to buildLevels(): Verdant Rift (70s/2 rifts), Cinder Gauntlet
  (85s/1 rift + heavies), Glacius Last Stand (68s/3 rifts). Flat arenas + a few platforms = battle focus.
  Galaxy map now shows 7 nodes (renders dynamically).

## Rifts / portals (enemy spawners)
- `portal` enemy type (in makeEnemy): stationary structure, hp (def.hp), spawns def.spawns every ~3.2s
  up to def.cap concurrent (tracked via spawned enemy's `fromPortal` back-ref). Spawned enemy is placed
  at the portal's ground level (y = portal base - h) and given matching baseY/groundY.
- Immune to launch (launchEnemy exempts brute+portal) and no recoil in hitEnemy (structures). No contact
  damage. Killed like any enemy (in `enemies` array) → room only clears once portal(s) + spawns are gone,
  so ignoring a rift = endless enemies. Objective shows "Destroy the rift" while one is alive. Coins:4.
- Placed in Sector 3 (Cinder — "cut the supply"), x:1650 spawning hoppers cap 3; forge boss moved to 1350.
  drawn as a swirling pulsing rift (--leech ring + --visor swirl). Reusable in any level via level.enemies.

## Enemy roster (mechs + drones + aliens)
- walker, flyer, turret, brute (armored→combo), charger (lunge→shield). Aliens: hopper —
  organic blob, leaps in arcs (grounded/airborne, groundY, hopT), green (--alien). leech — floaty
  violet siphon (--leech): drifts in and drains the shared `energy` on contact (LEECH_DRAIN/s);
  only bites health once energy hits 0. Handled OUTSIDE the generic contact-damage line.
- Mission briefing cards: #briefing overlay; launchWorld(i) shows it (state='briefing', themed),
  Deploy button / Enter / Space → deployWorld() loads the sector. Roadmap next: bosses (Warden
  Prime, Bloom Mother, Forgemaster, Progenitor), more encounter types (Warden, Splitter, Tether).

## Galaxy map (hub / world-select / progress)
- Flow: lobby Start/Enter → game-started shows #galaxy (state='map'); pick a sector → launchWorld(i)
  loads it; clear a sector → mark save.cleared[i]+bump save.maxWorld → shop ("Back to galaxy map")
  → showGalaxy(). Death overlay has Retry + "Galaxy Map" buttons.
- save gained maxWorld (highest unlocked idx) + cleared[] (per-sector). Node is unlocked if i<=maxWorld.
- renderGalaxy() builds nodes from buildLevels()+THEMES (planet-colored, locked=grayscale, cleared=green
  glow + green connector). #galaxyShop opens the shop from the map. Number keys 1–N deploy (keydown, state='map').
- Loop refactor: startGame() replaced by launchWorld(i)+ensureLoop() (RAF starts on first deploy);
  frame() early-returns while `level` is null (on the map pre-launch). 'win' state/overlay removed —
  completion shows "ALL SECTORS SECURED" on the map instead.

## Legs offense rebalance — launchers (screen.html)
- Legs was combat-weak (only a short kick) vs Arms (ranged shoot). Fixed by making Legs' movement
  offensive: KICK is now an UPPERCUT (box in front reaching up, y=p.y-8..~0.85h) and DASH is a
  dash-RAM — both call launchEnemy(e, up, dmg): damage (attributed 'legs') + pop the enemy airborne.
- Enemies gained baseY (rest y) + launchT. Launch physics at top of the enemy loop: while launchT>0,
  apply LAUNCH_GRAV, arc up, snap back to baseY on landing (vy>0 && y>=baseY), `continue` (AI + contact
  damage suspended → player is safe dashing through). launchT=1.5 safety cap (landing ends it first).
  Brutes are too heavy to launch (still take the hit). Synergy: Legs pops enemies up → Arms shoots them.
- Constants: DASH_KNOCKUP 470, KICK_KNOCKUP 560, LAUNCH_GRAV 1500. Kick draw = leg swings up + upward arc.
- KICK↔PUNCH juggle combo: kick (Legs) uppercuts enemies UP; punch (Arms) is now an OVERHEAD DOWN-SWING
  that reaches up+forward (box y=p.y-h*1.2, h=h*2.0, facing dir) to catch airborne enemies and SPIKE them
  down (smashEnemy: vy=500 via launch physics, +1 bonus dmg when airborne). Punch once-per-swing via
  p.punchId/lastPunchHit; also damages bosses (hurtBoss). drawPlayer punch = overhead arc sweep (prog off punchT).
- Because launchers give Legs crowd-control (single enemies are trivial to neutralize), enemy DENSITY was
  bumped + ramped: S1=5, S2=6, S3=7, S4=7 mob wave (was ~3-4 flat). Each level keeps turrets/flyers
  (hard to juggle) for sustained pressure; bosses still activate after the wave is cleared.
- NOTE: preview_screenshot was timing out this session (renderer/tool issue) — verified functionally only.

## Shared energy pool (screen.html)
- `energy` (0..ENERGY_MAX=100, regen ENERGY_REGEN/s), reset full each level. One pool shared by
  BOTH players → coordination tension. Meter drawn under the shield meter (orange, --engine).
- Costs: dash E_DASH, double-jump E_DOUBLEJUMP (first/ground jump is FREE), thrust E_THRUST/sec
  (drains while held; cuts out at 0), Combo Strike E_COMBO. Basic shoot/punch/kick are FREE.
- Insufficient energy → action doesn't fire + SFX.denied. Combo gating is in triggerCombo();
  the basic kick/punch still land, only the radial burst is withheld.

## Music (procedural, WebAudio, no asset files)
- Lookahead scheduler (setInterval 25ms) plays an 8th-note grid on the audio timeline via musicNote()
  through a master `musicGain` node. Layers: bass on the bar + root-fifth-octave arpeggio + optional
  kick/hat drums. mtof() = MIDI→freq.
- Tracks: exploreTrack(world) (per-world root/tempo/wave; cinder adds drums), BOSS_TRACK (faster,
  tense phrygian chords, drums), MAP_TRACK (calm major). Adaptive hooks: loadLevel→explore,
  activateBoss→boss, killBoss→explore, showGalaxy→map, showOverlay('dead')→musicStop().
- M key = musicToggle() (mute). Audio unlocks on the first real gesture (initAudio→actx.resume).
  NOTE: can't be heard in the headless preview; verify note scheduling programmatically (osc count).

## Comedy: blame card (death screen) — lean into the co-op "whose fault?" hook
- `run` stats object (resetRun() each loadLevel): jumps, dashes, shots, shotHits, punches, combos,
  thrustS, killLegs/killArms/killCombo, hitsTaken, eLegs/eArms (shared-reactor usage split), death.
- Kills attributed via a `source` param threaded through hurtEnemies()/hitEnemy()/killEnemy()
  (kick='legs', punch/shoot='arms', combo='combo'). Reactor split: dash/2×jump=Legs, thrust=Arms,
  combo split 50/50. death set to 'fall' (Legs) or 'combat'.
- showOverlay('dead') → buildBlameCard(): a verdict line (fall→blame LEGS, low accuracy→roast ARMS,
  reactor hog, zero kills, no combos, else generic) + 🦿LEGS / 💪ARMS stat columns + shared combo line.
- FUTURE comedy: positive recap on sector-clear/shop, MVP/"weak link" badge, shareable stat card (virality).

## Camera (screen.html)
- Smooth follow of the single shared player. camX/camY lerp toward targets (dt*5 horiz, dt*3 vert).
- Horizontal: targetX = playerMidX - W*0.42 + facing*90 (look-ahead), clamped camX>=0.
- Vertical: ground-referenced — targetY = player.groundRefY - H*0.78 (groundRefY = feet, updated only
  when onGround). So JUMPS DON'T SCROLL the camera (no bounce/nausea). Safety net: if the player rises
  near the top (screen <18%), camera follows up so high thrust-climbs / high exits stay visible.
  Clamp camY <= H*0.05 so it never scrolls below base ground into the void. Snapped to target in loadLevel.
- GOTCHA (fixed): camera block must not redeclare pcx/pcy (already const in update's enemy loop) — used
  camMidX/camMidY. A duplicate `const` is a parse error that silently kills the whole inline script.

## Game feel / juice (screen.html)
- Base juice: screen shake, hit-stop (hitStopT), particles, squash&stretch, WebAudio SFX, damage flash.
- SHAKE TUNED DOWN for motion comfort: SHAKE_MAX 15, addShake scales input ×0.45, fast decay
  (dt*18 + dt*12), draw applies offset only when shake>0.6 at ×0.8. Peaks ~6 even in sustained combat.
- Character NO LONGER blinks: visor is steady (removed p.blink height toggle); i-frame flicker softened
  from 10Hz strobe to a gentle ~3/s flash (Math.floor(invuln*6)%2).
- Hitting: hitEnemy() adds recoil nudge + knockback (e.kb, decays in enemy loop) + hit-pop squash
  (e.pop, applied as a scale in the enemy draw wrap) + white impact spark + ~0.03s hit-stop per hit.
- Getting hit: damagePlayer() → flashT 0.42, addShake 20, hitStopT 0.07 (freeze-frame), knockback,
  white spark + rumblePhones('hurt'|'block') → screen-state {rumble} → index.html navigator.vibrate.
- Movement: coyote time (player.coyoteT 0.1s) + jump buffer (player.jumpBufferT 0.12s) for responsive
  jumps; jump priority = ground/coyote → WALL JUMP → in-air double.
- Wall-slide + wall-jump: horizontal collision sets player.onWallNow + wallDir; slide clamps fall to
  WALL_SLIDE_SPEED while airborne+pressing a wall; wall jump (free, refreshes double, arcs away via
  wallJumpVx over WALL_JUMP_LOCK 0.22s, faces away) uses wallCoyoteT window. Constants near DASH_*.
- Terrain: collision is now AXIS-SEPARATED. Horizontal pass = WALL collision (platforms are solid
  columns from pl.y→H; 6px top-grace so standing-on-top isn't a wall; wall-bump shake+dust). Vertical
  pass = floor landing (unchanged). S1 arena platforms lowered to gy-95 so a single jump mounts them.
  WATCH in playtest: S2 high climb + S3 moving-platform ride with the new walls.

## Coordination moves (both players)
- COMBO STRIKE: Legs KICK + Arms PUNCH within ~0.17s → radial blast (big damage +
  knockback + screen shake/hit-stop). Keyboard: W+G together.
- CO-OP SHIELD: BOTH hold Guard at once → damage-blocking bubble; drains a meter,
  regens when down; planting (no move/attack) while up. Keyboard: hold Q + L.
- Juice pass in screen.html: screen shake, hit-stop, particles, squash & stretch,
  and a WebAudio synth (SFX object) — no sound asset files.

## Game design (current)
- Core: combat + coordination. Arena rooms: clear all enemies to unlock the exit.
- Shared health bar (5 hearts), full refill on clearing a room, death retries current room.
- Enemies: walker (ground chaser), flyer (floats toward you), turret (stationary shooter),
  brute (armored — needs Combo Strike to crack), charger (winds up then lunges — Shield the
  lunge, punish the recovery).
- 4 levels in buildLevels(); Room 2 needs jump+thrust to reach a high exit; Room 4 (Heavies)
  requires the combo + shield coordination moves to clear.

## Next tasks
1. DONE — keyboard debug mode on screen.html (WASD+Space legs, Arrows+F/G/H
   arms). One person can now drive both roles solo with no phones.
2. Pull levels out of screen.html into their own levels.js file.
3. Later: split screen.html into modules; simple in-browser level editor.

## Phone-driven menu navigation (TV mode)
The TV (screen.html) is a pure display; phones drive ALL menus, so the game works on
a real TV with no keyboard/mouse. Three-file relay:
- server/index.js: added a `menu` relay (phone → screen, mirrors `input`).
- screen.html: `setMenu(payload)` broadcasts the current menu state to phones via
  `screen-state` (menu field present). Helpers `menuMap()` / `menuShop()` build the
  map/shop payloads. `setMenu` is called at every transition (loadLevel→play,
  launchWorld→briefing, showGalaxy→map, openShop→shop, buyUpgrade→shop refresh,
  showOverlay→dead). A `socket.on('menu', ...)` dispatcher maps phone commands
  (start/deploy/shop/buy/confirm/togalaxy) onto the existing functions, guarded by
  `state`. `game-started` is guarded by a `gameEntered` flag; the roster handler
  re-sends `currentMenu` so a late-joining phone catches up.
- index.html: `screen-state` messages carrying a `menu` field route to `applyMenu()`
  (gameplay rumble/thrust messages have no menu field). `renderMenu()` builds the
  lobby/map/briefing/shop/dead views; taps call `sendMenuCmd()` → server `menu` event.
  Pad is built lazily on first `menu:'play'`. Portrait "rotate" prompt now keys off
  `body.in-pad` (only during actual gameplay, not menus).
Verified via preview: payload shapes + phone rendering + command dispatch + screen
state-machine broadcasts all round-trip cleanly.

## Polish pass (2026-07-04)
- Playtest via headless sim (drive `inp`/`queue`, step `frame(t)` on a single monotonic clock):
  all 7 levels spawn on-ground, no fall-through, no runtime errors; a dumb aim+shoot AI
  clears Sector 1's mobs in ~8s and chunks the Warden to 17% HP → core combat is sound.
- Victory ending added: `completeSector` detects `LEVELS.every(cleared)` → `state='win'` +
  `showOverlay('win')` ("GALAXY SECURED" + celebratory `buildBlameCard(true)` mission report;
  single "Return to Galaxy Map" button; overlayBtn is state-aware: win→showGalaxy, else retry).
  Previously `showOverlay('win')` was defined but NEVER called — final boss just dumped to map.
- New Game / save reset: `resetSave()` + `#galaxyNew` header button with a two-click arm/confirm
  (label → "⚠ Erase progress?" for 3s). Wipes coins/upgrades/cleared, re-renders map + phone menu.
- Phone win menu labels aligned (Return to Map, not "PLAY AGAIN").

## What's still missing for a "final" build (honest, prioritized)
1. A REAL two-player phone playtest on a TV — nothing above substitutes for it. #1 blocker.
2. Remote play — currently local-WiFi only; deploy (Fly.io/Railway) for cross-network play.
3. Pause / resume (couch breaks) — none exists.
4. Reconnect handling — DONE. Phones keep a per-tab clientId + session and auto-rejoin/
   reclaim their role on any socket reconnect ("Reconnecting…" overlay); server does
   token-based reclaim (no role-stealing, kicks stale socket); screen shows dropped/
   reconnected banners. Hosted on Railway (github erik123567/coop-game, auto-deploy on push;
   QR/join uses same-origin when hosted). Start now gated on BOTH players connected.
5. Onboarding — no first-time "how to play"; relies on button labels + the kb hint.
6. Audio depth — SFX + adaptive music exist but are thin; no volume/mute UI beyond `M` key.
7. Content volume — 7 levels/4 bosses is a demo arc, not a full campaign.
8. Boss set-pieces still TODO: Warden shockwave-dash, Forge charge-dodge counter.

## Known constraints
- Local-WiFi only right now (no remote play yet).
- Solo testing is hard (co-op needs 2 people) — hence the debug mode task.