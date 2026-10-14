import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { Server } from 'socket.io';
import { Match } from './match';
import { validateMatchOptions, type MatchOptions } from './format';
import type { Reply } from '../shared/protocol';
export function createTableServer(makeMatch: (request: import('node:http').IncomingMessage, options: MatchOptions) => Match = (_, options) => new Match(options)) {
const http = createServer((_, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, service: 'pokemon-tabletop' })); });
const io = new Server(http, { maxHttpBufferSize: 16384 });
type Session = { match: Match; touched: number; timer?: ReturnType<typeof setTimeout> };
const sessions = new Map<string, Session>();
function publish(token: string) { const s = sessions.get(token); if (s) io.to(token).emit('match:state', s.match.view()); }
function schedule(token: string) {
  const s = sessions.get(token); if (!s || s.timer) return;
  s.timer = setTimeout(() => { s.timer = undefined; if (!io.sockets.adapter.rooms.get(token)?.size) return; const moved = s.match.botStep(); publish(token); if (moved) schedule(token); }, 450);
}
io.on('connection', socket => {
  let token: string | undefined;
  const handle = (fn: (data: any) => Reply) => (data: any, ack: (reply: Reply) => void) => {
    if (typeof ack !== 'function') return;
    try { ack(fn(data)); if (token) { publish(token); schedule(token); } }
    catch (e) { ack({ ok: false, error: (e as any)?.message || String(e) }); if (token) publish(token); }
  };
  socket.on('match:start', handle(data => {
    const options = validateMatchOptions(data);
    const match = makeMatch(socket.request, options);
    if (token) { socket.leave(token); const old = sessions.get(token); if (old?.timer) clearTimeout(old.timer); sessions.delete(token); }
    token = randomBytes(24).toString('hex');
    sessions.set(token, { match, touched: Date.now() }); socket.join(token);
    return { ok: true, token, state: match.view() };
  }));
  socket.on('match:resume', handle(data => {
    if (typeof data?.token !== 'string' || !sessions.has(data.token)) throw Error('This match has expired. Start a new match.');
    if (token) socket.leave(token); token = data.token; socket.join(token!);
    const session = sessions.get(token!)!; session.touched = Date.now();
    return { ok: true, token, state: session.match.view() };
  }));
  const current = () => { const s = token && sessions.get(token); if (!s) throw Error('Start or resume a match first.'); s.touched = Date.now(); return s.match; };
  socket.on('match:action', handle(data => {
    if (!Number.isInteger(data?.revision) || typeof data?.id !== 'string') throw Error('Invalid action payload.');
    current().act(1, data.revision, data.id); return { ok: true };
  }));
  socket.on('match:prompt', handle(data => {
    if (!Number.isInteger(data?.revision) || !Number.isInteger(data?.id)) throw Error('Invalid prompt payload.');
    current().resolve(1, data.revision, data.id, data.keys); return { ok: true };
  }));
});
setInterval(() => { for (const [token, s] of sessions) if (Date.now() - s.touched > 2 * 60 * 60 * 1000 && !io.sockets.adapter.rooms.has(token)) { if (s.timer) clearTimeout(s.timer); sessions.delete(token); } }, 60000).unref();
return http;
}
