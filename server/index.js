// ---------------------------------------------------------------------------
// Co-op Split Control — relay server
//
// This server does NOT run game logic. It only:
//   1. Serves the static screen + controller web pages.
//   2. Manages rooms (a short code per TV session).
//   3. Relays input messages from phones -> the TV screen for that room.
//   4. Relays small state messages from the TV screen -> phones
//      (e.g. "thrusters are now available").
//
// All physics / rendering happens on the TV screen client (public/screen.html).
// ---------------------------------------------------------------------------

const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

// Find this machine's LAN IPv4 address(es) so phones can reach the server.
// Phones can't use "localhost" — that means the phone itself. They need the
// PC's address on the local network (usually 192.168.x.x).
function getLanIps() {
  const nets = os.networkInterfaces();
  const found = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const isV4 = net.family === 'IPv4' || net.family === 4;
      if (isV4 && !net.internal) found.push(net.address);
    }
  }
  // Rank most-likely-correct home addresses first.
  const rank = (ip) => {
    if (ip.startsWith('192.168.56.')) return 5;      // VirtualBox host-only (usually wrong)
    if (ip.startsWith('192.168.'))    return 0;       // typical home router
    if (ip.startsWith('10.'))         return 1;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2; // 172.16–31 (incl. WSL/Docker)
    return 3;
  };
  return found.sort((a, b) => rank(a) - rank(b));
}
const LAN_IPS = getLanIps();

const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));

const server = http.createServer(app);
const io = new Server(server);

// code -> { screen: socketId, players: { legs?: socketId, arms?: socketId } }
const rooms = {};

// Avoid ambiguous chars (0/O, 1/I) so codes are easy to read off a TV.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

function roster(room) {
  return { legs: !!room.players.legs, arms: !!room.players.arms };
}

io.on('connection', (socket) => {
  // --- TV screen creates a room --------------------------------------------
  socket.on('create-room', () => {
    let code;
    do { code = makeCode(); } while (rooms[code]);
    rooms[code] = { screen: socket.id, players: {}, tokens: {} };
    socket.join(code);
    socket.data.room = code;
    socket.data.isScreen = true;
    socket.emit('room-created', {
      code,
      host: LAN_IPS[0] || null,   // best-guess LAN IP for phones to reach
      port: PORT,
      candidates: LAN_IPS,        // all detected IPs, in case the first is wrong
    });
  });

  // --- Phone joins a room ---------------------------------------------------
  socket.on('join-room', ({ code, preferredRole, clientId }) => {
    code = (code || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) { socket.emit('join-error', { message: 'No game found with that code.' }); return; }
    room.tokens = room.tokens || {};

    // Reconnect reclaim: the same client (matching token) returning to the role it held.
    // This wins even if the old socket's disconnect hasn't been detected yet (network blip).
    let role = preferredRole;
    const reclaiming = role && clientId && room.tokens[role] === clientId;
    if (!reclaiming && (!role || room.players[role])) {
      role = !room.players.legs ? 'legs' : (!room.players.arms ? 'arms' : null);
    }
    if (!role) { socket.emit('join-error', { message: 'This game already has two players.' }); return; }

    const stale = room.players[role];
    room.players[role] = socket.id;
    if (clientId) room.tokens[role] = clientId;
    // Kick a stale socket still holding this role (reclaim path) so we don't have two.
    if (stale && stale !== socket.id) { const s = io.sockets.sockets.get(stale); if (s) s.disconnect(true); }

    socket.join(code);
    socket.data.room = code;
    socket.data.role = role;

    socket.emit('joined', { role, code });
    io.to(room.screen).emit('roster', roster(room));
  });

  // --- Phone -> screen: input ----------------------------------------------
  socket.on('input', (msg) => {
    const room = rooms[socket.data.room];
    if (!room) return;
    io.to(room.screen).emit('input', { role: socket.data.role, ...msg });
  });

  // --- Phone -> screen: menu navigation (start / pick sector / buy / deploy) --
  socket.on('menu', (msg) => {
    const room = rooms[socket.data.room];
    if (!room) return;
    io.to(room.screen).emit('menu', { role: socket.data.role, ...msg });
  });

  // --- Screen -> phones: small state updates (thrusters, etc.) --------------
  socket.on('screen-state', (msg) => {
    const code = socket.data.room;
    if (!code) return;
    socket.to(code).emit('screen-state', msg); // everyone in room except sender
  });

  // --- Screen starts / restarts the game -----------------------------------
  socket.on('start-game', () => {
    const code = socket.data.room;
    if (code) io.to(code).emit('game-started');
  });

  // --- Cleanup --------------------------------------------------------------
  socket.on('disconnect', () => {
    const code = socket.data.room;
    const room = rooms[code];
    if (!room) return;

    if (socket.data.isScreen) {
      io.to(code).emit('screen-left');
      delete rooms[code];
    } else {
      const role = socket.data.role;
      // Only fire if THIS socket still owns the role — a reclaimed (reconnected) socket
      // will have already taken it over, so a stale disconnect must not clear it.
      if (role && room.players[role] === socket.id) {
        delete room.players[role];
        io.to(room.screen).emit('roster', roster(room));
        io.to(room.screen).emit('player-left', { role });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = LAN_IPS[0];
  console.log(`\n  Co-op Split Control server running.`);
  console.log(`  TV screen:   http://localhost:${PORT}/screen.html`);
  if (ip) {
    console.log(`  Phone join:  http://${ip}:${PORT}/   (scan the QR on the TV — it uses this)`);
  } else {
    console.log(`  Phone join:  could not auto-detect a LAN IP; run 'ipconfig' and use your IPv4 address`);
  }
  if (LAN_IPS.length > 1) {
    console.log(`  Other detected IPs (try these if the first doesn't work): ${LAN_IPS.slice(1).join(', ')}`);
  }
  console.log('');
});