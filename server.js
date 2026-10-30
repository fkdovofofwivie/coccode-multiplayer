const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true }, pingInterval: 25000, pingTimeout: 20000 });
const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 12;
const rooms = new Map();
const playerRoom = new Map();
const colors = [0xfdfdfd, 0xf0d9a0, 0xd6a45b, 0xb9d0a2, 0xe6b7a8, 0xc5b7e8, 0x9ccbd0, 0xd8d8d8, 0xe6d16b, 0xb5c98e, 0xd9a1c7, 0xb9a7a0];

app.use(express.static(__dirname));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

function makeCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (rooms.has(code));
  return code;
}
function publicPlayer(p) { return { id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, z: p.z, ang: p.ang, ph: p.ph, air: p.air, sp: p.sp }; }
function leaveRoom(socket) {
  const code = playerRoom.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  playerRoom.delete(socket.id);
  socket.leave(code);
  if (!room) return;
  room.players.delete(socket.id);
  socket.to(code).emit('player-left', socket.id);
  if (room.players.size === 0) rooms.delete(code);
}
function enterRoom(socket, code, ack) {
  const room = rooms.get(code);
  if (!room) return ack?.({ ok: false, error: 'Codice non trovato. Controlla le 4 cifre.' });
  if (room.players.size >= MAX_PLAYERS) return ack?.({ ok: false, error: `Stanza piena (massimo ${MAX_PLAYERS} giocatori).` });
  leaveRoom(socket);
  const p = { id: socket.id, name: `Pollo ${room.players.size + 1}`, color: colors[Math.floor(Math.random() * colors.length)], x: 6, y: 0, z: 8, ang: 0, ph: 0, air: false, sp: 0 };
  room.players.set(socket.id, p);
  playerRoom.set(socket.id, code);
  socket.join(code);
  const others = [...room.players.values()].filter(q => q.id !== socket.id).map(publicPlayer);
  socket.emit('room-state', { players: others });
  socket.to(code).emit('player-joined', publicPlayer(p));
  ack?.({ ok: true, code, players: others, maxPlayers: MAX_PLAYERS });
}

io.on('connection', socket => {
  socket.on('create-room', (_data, ack) => {
    leaveRoom(socket);
    const code = makeCode();
    rooms.set(code, { players: new Map() });
    enterRoom(socket, code, ack);
  });
  socket.on('leave-room', () => leaveRoom(socket));
  socket.on('join-room', (data, ack) => {
    const code = String(data?.code || '').trim();
    if (!/^\d{4}$/.test(code)) return ack?.({ ok: false, error: 'Il codice deve contenere 4 cifre.' });
    enterRoom(socket, code, ack);
  });
  socket.on('player-move', data => {
    const code = playerRoom.get(socket.id);
    const room = code && rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!p || !data || typeof data !== 'object') return;
    for (const k of ['x', 'y', 'z', 'ang', 'ph', 'sp']) {
      const v = Number(data[k]);
      if (!Number.isFinite(v)) return;
      p[k] = Math.max(k === 'y' ? 0 : -500, Math.min(k === 'y' ? 40 : 500, v));
    }
    p.air = !!data.air;
    socket.to(code).volatile.emit('player-moved', publicPlayer(p));
  });
  socket.on('disconnect', () => leaveRoom(socket));
});

server.listen(PORT, '0.0.0.0', () => console.log(`Coccodè Multiplayer attivo sulla porta ${PORT}`));
