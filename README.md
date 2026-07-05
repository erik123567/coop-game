# SPLIT UNIT — co-op mech brawler

**One machine. Two pilots.** One character, two players, two phones, one TV.
The **Legs** player steers the body (move · jump · dash · kick · wall-jump); the **Arms**
player swings the weapons (aim · shoot · punch · thrust). You share one health bar, one
energy reactor, and the blame when it all goes wrong.

Jackbox-style setup: the TV is just a web page, phones are web-page controllers, no app
install. The TV is a pure display — **phones drive every menu** (lobby, galaxy map,
briefing, shop, death screen), so it plays on an actual living-room TV.

---

## What's here

```
coop-game/
  server/index.js     Relay server (rooms + input forwarding). No game logic.
  public/screen.html  The TV screen — runs ALL physics & rendering.
  public/index.html   The phone controller (adapts to Legs or Arms role).
  package.json
```

---

## Run it (about 2 minutes)

You need Node.js installed (v18+). Then:

```bash
cd coop-game
npm install
npm start
```

You'll see:
```
TV screen:   http://localhost:3000/screen.html
Phone join:  http://localhost:3000/
```

### On the TV / laptop
Open **http://localhost:3000/screen.html** in a browser (plug the laptop into the TV via HDMI, or just use the laptop screen for testing). The **SPLIT UNIT** title screen appears with a room code + QR code.

### On each phone (same WiFi as the computer)
Phones can't reach `localhost` — they need your computer's LAN IP.

1. Find your computer's local IP:
   - macOS: `ipconfig getifaddr en0`
   - Windows: `ipconfig` → IPv4 Address
   - Linux: `hostname -I`
2. On each phone's browser go to `http://<THAT-IP>:3000/`
   (or just scan the QR code on the TV — it already points there).
3. Enter the 4-character code, pick **Legs** or **Arms**, tap Join.

When both phones are in, tap **START** on either phone (or press Enter / click Start on the
TV). From there the phones drive everything — pick a sector on the galaxy map, deploy, buy
upgrades in the hangar, retry after a wipe — all without touching the TV.

**Solo / no phones?** Press **Enter** (or click **Start**) on the TV to drive both roles
from the keyboard: `WASD`+`Space` for Legs, arrows + `F`/`G`/`H` for Arms. The on-screen
hint lists every key.

---

## Controls

**LEGS phone**
- Left half: drag = move left/right
- JUMP button: press once = jump, press again mid-air = double jump
- DASH button: quick horizontal burst (short cooldown)
- KICK button: forward kick in the direction you're facing

**ARMS phone**
- Left half: drag = aim direction (drives both shooting and punching)
- SHOOT button: fires along the aim direction
- PUNCH button: melee in the aim direction
- THRUST button: lights up **only after the Legs player jumps** — hold it to boost upward mid-air. (This is the forced-coordination mechanic: Arms can't thrust until Legs commits to a jump.)

Kick launches enemies up; punch is a down-swing — chain them for combos. Both players
holding GUARD together raises a shared shield; a kick + punch landed together triggers a
combo strike. Clear a room's enemies (or destroy its rifts before the timer runs out) to
advance, then land on the next world.

---

## Tuning the feel

All the movement/attack numbers live at the top of `public/screen.html` under
`Tunable constants` (jump height, dash speed, thrust force, cooldowns, etc.).
Change them, refresh the TV page, and re-test.

---

## Notes / next steps
- This is **local-WiFi** play. Latency feels instant on a LAN. Remote/online play (players in different houses) would add a hosted server and noticeable latency — decide if it's worth it after this feels good.
- Deploy later: push the same code to Fly.io or Railway and phones + TV just hit the public URL instead of your LAN IP.
- Reconnection, pause-on-disconnect, and a proper lobby-ready check are intentionally minimal here — this build is about proving the two-phone control feel.
