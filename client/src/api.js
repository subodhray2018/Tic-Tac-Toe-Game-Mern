// Thin REST client. Game endpoints resolve to the full game state (including scoreboard).

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    const err = new Error('Cannot reach the game server.');
    err.network = true;
    throw err;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status}).`);
    err.status = res.status;
    err.code = body.code;
    throw err;
  }
  return body;
}

const post = (path, body) =>
  request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const api = {
  createGame: (mode) => post('/games', { mode }),
  getGame: (id) => request(`/games/${id}`),
  move: (id, player, index) => post(`/games/${id}/moves`, { player, index }),
  undo: (id) => post(`/games/${id}/undo`),
  reset: (id) => post(`/games/${id}/reset`),
  getScoreboard: () => request('/scoreboard'),
  resetScoreboard: () => post('/scoreboard/reset'),
};
