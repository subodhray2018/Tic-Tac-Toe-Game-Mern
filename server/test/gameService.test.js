'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GameService, GameError } = require('../src/gameService');

/** Plays the given cells, each by whoever's turn it is (two-player flow). */
function playCells(svc, id, cells) {
  let state;
  for (const index of cells) {
    state = svc.makeMove(id, { player: svc.getGame(id).currentPlayer, index });
  }
  return state;
}

const rejects = (fn, code) =>
  assert.throws(fn, (e) => e instanceof GameError && e.code === code, `expected ${code}`);

function setup(mode = 'TwoPlayer') {
  const svc = new GameService();
  return { svc, id: svc.createGame(mode).id };
}

// ---------- creating / reading ----------

test('creates a game with a fresh state', () => {
  const { svc, id } = setup();
  const g = svc.getGame(id);
  assert.equal(typeof g.id, 'string');
  assert.deepEqual(g.board, Array(9).fill(null));
  assert.equal(g.currentPlayer, 'X');
  assert.equal(g.mode, 'TwoPlayer');
  assert.equal(g.status, 'InProgress');
  assert.equal(g.winner, null);
  assert.equal(g.winningCells, null);
  assert.deepEqual(g.moves, []);
  assert.equal(g.canUndo, false);
  assert.deepEqual(g.scoreboard, { X: 0, O: 0, draws: 0 });
});

test('rejects an unknown mode and an unknown game id', () => {
  const svc = new GameService();
  rejects(() => svc.createGame('Chaos'), 'INVALID_MODE');
  rejects(() => svc.getGame('nope'), 'GAME_NOT_FOUND');
});

test('each game is independent but shares the scoreboard', () => {
  const svc = new GameService();
  const a = svc.createGame().id;
  const b = svc.createGame().id;
  playCells(svc, a, [0, 3, 1, 4, 2]);
  assert.equal(svc.getGame(b).moves.length, 0);
  assert.equal(svc.getGame(b).scoreboard.X, 1);
});

// ---------- valid / invalid moves ----------

test('valid move places the mark and records history (index form)', () => {
  const { svc, id } = setup();
  const g = svc.makeMove(id, { player: 'X', index: 4 });
  assert.equal(g.board[4], 'X');
  assert.deepEqual(g.moves, [{ moveNumber: 1, player: 'X', index: 4, row: 2, column: 2 }]);
  assert.equal(g.canUndo, true);
});

test('valid move accepts 1-based row and column', () => {
  const { svc, id } = setup();
  const g = svc.makeMove(id, { player: 'X', row: 3, column: 1 });
  assert.equal(g.board[6], 'X');
});

test('rejects moves outside the board', () => {
  const { svc, id } = setup();
  for (const bad of [{ index: -1 }, { index: 9 }, { index: 1.5 }, { index: '1' }, { row: 0, column: 1 }, { row: 1, column: 4 }, {}]) {
    rejects(() => svc.makeMove(id, { player: 'X', ...bad }), 'OUT_OF_BOUNDS');
  }
  assert.equal(svc.getGame(id).moves.length, 0);
});

test('rejects an occupied cell without changing the turn', () => {
  const { svc, id } = setup();
  svc.makeMove(id, { player: 'X', index: 0 });
  rejects(() => svc.makeMove(id, { player: 'O', index: 0 }), 'CELL_OCCUPIED');
  const g = svc.getGame(id);
  assert.equal(g.currentPlayer, 'O');
  assert.equal(g.moves.length, 1);
});

test('rejects a move by the wrong player', () => {
  const { svc, id } = setup();
  rejects(() => svc.makeMove(id, { player: 'O', index: 0 }), 'WRONG_TURN');
  svc.makeMove(id, { player: 'X', index: 0 });
  rejects(() => svc.makeMove(id, { player: 'X', index: 1 }), 'WRONG_TURN');
  assert.equal(svc.getGame(id).currentPlayer, 'O');
});

test('rejects a missing or unknown player', () => {
  const { svc, id } = setup();
  rejects(() => svc.makeMove(id, { index: 0 }), 'INVALID_PLAYER');
  rejects(() => svc.makeMove(id, { player: 'Z', index: 0 }), 'INVALID_PLAYER');
});

test('turns alternate after every valid move', () => {
  const { svc, id } = setup();
  assert.equal(svc.makeMove(id, { player: 'X', index: 0 }).currentPlayer, 'O');
  assert.equal(svc.makeMove(id, { player: 'O', index: 1 }).currentPlayer, 'X');
  assert.equal(svc.makeMove(id, { player: 'X', index: 2 }).currentPlayer, 'O');
});

// ---------- win / draw / completion ----------

const WIN_CASES = [
  ['row', [0, 3, 1, 4, 2], [0, 1, 2]],
  ['column', [0, 1, 3, 4, 6], [0, 3, 6]],
  ['diagonal', [0, 1, 4, 2, 8], [0, 4, 8]],
];
for (const [name, moves, cells] of WIN_CASES) {
  test(`${name} win: reports winner and winning cells`, () => {
    const { svc, id } = setup();
    const g = playCells(svc, id, moves);
    assert.equal(g.status, 'Won');
    assert.equal(g.winner, 'X');
    assert.deepEqual(g.winningCells, cells);
  });
}

test('draw is detected when the board fills without a winner', () => {
  const { svc, id } = setup();
  const g = playCells(svc, id, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(g.status, 'Draw');
  assert.equal(g.winner, null);
  assert.equal(g.winningCells, null);
});

test('moves are rejected after a win or a draw', () => {
  const won = setup();
  playCells(won.svc, won.id, [0, 3, 1, 4, 2]);
  rejects(() => won.svc.makeMove(won.id, { player: 'O', index: 8 }), 'GAME_OVER');

  const drawn = setup();
  playCells(drawn.svc, drawn.id, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
  rejects(() => drawn.svc.makeMove(drawn.id, { player: 'X', index: 0 }), 'GAME_OVER');
});

// ---------- scoreboard ----------

test('scoreboard counts X wins, O wins and draws once each', () => {
  const svc = new GameService();
  const x = svc.createGame().id;
  playCells(svc, x, [0, 3, 1, 4, 2]);
  const o = svc.createGame().id;
  playCells(svc, o, [0, 3, 1, 4, 8, 5]);
  const d = svc.createGame().id;
  playCells(svc, d, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.deepEqual(svc.getScoreboard(), { X: 1, O: 1, draws: 1 });
});

test('scoreboard is not incremented by rejected moves after completion', () => {
  const { svc, id } = setup();
  playCells(svc, id, [0, 3, 1, 4, 2]);
  for (let i = 0; i < 3; i++) assert.throws(() => svc.makeMove(id, { player: 'O', index: 8 }));
  assert.deepEqual(svc.getScoreboard(), { X: 1, O: 0, draws: 0 });
});

test('reset scoreboard zeroes the counts', () => {
  const { svc, id } = setup();
  playCells(svc, id, [0, 3, 1, 4, 2]);
  assert.deepEqual(svc.resetScoreboard(), { X: 0, O: 0, draws: 0 });
  assert.deepEqual(svc.getGame(id).scoreboard, { X: 0, O: 0, draws: 0 });
});

test('reset scoreboard does not re-count a finished game still on screen', () => {
  const { svc, id } = setup();
  playCells(svc, id, [0, 3, 1, 4, 2]);
  svc.resetScoreboard();
  svc.undo(id);
  assert.deepEqual(svc.getScoreboard(), { X: 0, O: 0, draws: 0 });
});

// ---------- reset game ----------

test('reset game clears board, history and status but keeps scoreboard, id and mode', () => {
  const { svc, id } = setup();
  playCells(svc, id, [0, 3, 1, 4, 2]);
  const g = svc.resetGame(id);
  assert.equal(g.id, id);
  assert.equal(g.mode, 'TwoPlayer');
  assert.deepEqual(g.board, Array(9).fill(null));
  assert.deepEqual(g.moves, []);
  assert.equal(g.currentPlayer, 'X');
  assert.equal(g.status, 'InProgress');
  assert.equal(g.winner, null);
  assert.deepEqual(g.scoreboard, { X: 1, O: 0, draws: 0 });
});

test('a game can be replayed after reset and is scored again', () => {
  const { svc, id } = setup();
  playCells(svc, id, [0, 3, 1, 4, 2]);
  svc.resetGame(id);
  playCells(svc, id, [0, 3, 1, 4, 2]);
  assert.equal(svc.getScoreboard().X, 2);
});

// ---------- undo ----------

test('two-player undo removes only the most recent move', () => {
  const { svc, id } = setup();
  playCells(svc, id, [0, 4]);
  const g = svc.undo(id);
  assert.equal(g.moves.length, 1);
  assert.equal(g.board[4], null);
  assert.equal(g.board[0], 'X');
  assert.equal(g.currentPlayer, 'O');
});

test('undo is rejected (and canUndo false) when there are no moves', () => {
  const { svc, id } = setup();
  rejects(() => svc.undo(id), 'NOTHING_TO_UNDO');
  assert.equal(svc.getGame(id).canUndo, false);
});

test('undo after completion reverses the result and the scoreboard (Option B)', () => {
  const { svc, id } = setup();
  playCells(svc, id, [0, 3, 1, 4, 2]);
  const g = svc.undo(id);
  assert.equal(g.status, 'InProgress');
  assert.equal(g.winner, null);
  assert.equal(g.winningCells, null);
  assert.equal(g.currentPlayer, 'X');
  assert.deepEqual(g.scoreboard, { X: 0, O: 0, draws: 0 });
  // finishing again counts exactly once
  assert.deepEqual(svc.makeMove(id, { player: 'X', index: 2 }).scoreboard, { X: 1, O: 0, draws: 0 });
});

test('undo of a draw removes the draw from the scoreboard', () => {
  const { svc, id } = setup();
  playCells(svc, id, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(svc.getScoreboard().draws, 1);
  svc.undo(id);
  assert.equal(svc.getScoreboard().draws, 0);
});

// ---------- computer mode ----------

test('computer replies automatically with a valid move', () => {
  const { svc, id } = setup('Computer');
  const g = svc.makeMove(id, { player: 'X', index: 0 });
  assert.equal(g.moves.length, 2);
  assert.deepEqual(g.moves[1], { moveNumber: 2, player: 'O', index: 4, row: 2, column: 2 });
  assert.equal(g.currentPlayer, 'X');
});

test('human cannot play as O in computer mode', () => {
  const { svc, id } = setup('Computer');
  rejects(() => svc.makeMove(id, { player: 'O', index: 0 }), 'WRONG_TURN');
});

test('computer mode undo removes the computer move and the human move before it', () => {
  const { svc, id } = setup('Computer');
  svc.makeMove(id, { player: 'X', index: 0 }); // X0, O4
  svc.makeMove(id, { player: 'X', index: 1 }); // X1, O2 (blocks)
  const g = svc.undo(id);
  assert.equal(g.moves.length, 2);
  assert.deepEqual(g.moves.map((m) => m.index), [0, 4]);
  assert.equal(g.currentPlayer, 'X');
  assert.equal(svc.undo(id).moves.length, 0);
});

test('computer win ends the game, scores O once, and undo removes the pair', () => {
  const { svc, id } = setup('Computer');
  // X1,O4  X0,O2(block)  X3 -> O completes 2-4-6
  for (const index of [1, 0, 3]) svc.makeMove(id, { player: 'X', index });
  let g = svc.getGame(id);
  assert.equal(g.status, 'Won');
  assert.equal(g.winner, 'O');
  assert.deepEqual(g.winningCells, [2, 4, 6]);
  assert.deepEqual(g.scoreboard, { X: 0, O: 1, draws: 0 });
  rejects(() => svc.makeMove(id, { player: 'X', index: 8 }), 'GAME_OVER');
  g = svc.undo(id);
  assert.equal(g.moves.length, 4);
  assert.equal(g.currentPlayer, 'X');
  assert.deepEqual(g.scoreboard, { X: 0, O: 0, draws: 0 });
});

test('computer does not move after the human wins; undo then removes just that move', () => {
  const { svc, id } = setup('Computer');
  // Craft X0 O3 X1 O4 directly, then let the human complete the top row.
  const crafted = [[0, 'X'], [3, 'O'], [1, 'X'], [4, 'O']];
  svc.games.get(id).moves = crafted.map(([index, player], i) => ({
    moveNumber: i + 1, player, index, row: Math.floor(index / 3) + 1, column: (index % 3) + 1,
  }));
  const g = svc.makeMove(id, { player: 'X', index: 2 });
  assert.equal(g.status, 'Won');
  assert.equal(g.moves.length, 5); // no computer reply
  assert.deepEqual(g.scoreboard, { X: 1, O: 0, draws: 0 });
  const after = svc.undo(id);
  assert.equal(after.moves.length, 4);
  assert.deepEqual(after.scoreboard, { X: 0, O: 0, draws: 0 });
});

test('computer mode can finish in a draw', () => {
  const { svc, id } = setup('Computer');
  let g;
  for (const index of [0, 1, 6, 5, 7]) g = svc.makeMove(id, { player: 'X', index });
  assert.equal(g.status, 'Draw');
  assert.equal(g.moves.length, 9);
  assert.equal(g.scoreboard.draws, 1);
});

// ---------- housekeeping ----------

test('oldest games are evicted past the cap', () => {
  const svc = new GameService({ maxGames: 2 });
  const first = svc.createGame().id;
  svc.createGame();
  svc.createGame();
  rejects(() => svc.getGame(first), 'GAME_NOT_FOUND');
});
