'use strict';

const { randomUUID } = require('crypto');
const {
  HUMAN, COMPUTER, otherPlayer, buildBoard,
  evaluateBoard, chooseComputerMove, toPosition,
} = require('./gameLogic');

const MODES = ['TwoPlayer', 'Computer'];
const PLAYERS = ['X', 'O'];

/** Domain error carrying an HTTP status and a stable machine-readable code. */
class GameError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.status = status;
  }
}

const notFound = (id) => new GameError('GAME_NOT_FOUND', `Game "${id}" does not exist.`, 404);

/**
 * Owns all game sessions and the session-level scoreboard (in memory).
 *
 *  - Each game's `moves` array is its single source of truth; board, turn, status,
 *    winner and winning cells are derived from it, so Undo can't desync them.
 *  - The scoreboard is shared by all games. Scoring is idempotent (`_syncScore`): each
 *    game remembers the result it has contributed (`countedResult`), so a finished game
 *    counts exactly once. Undo is allowed after completion (Option B): undoing out of a
 *    finished game takes its result back off the scoreboard.
 */
class GameService {
  constructor({ maxGames = 100 } = {}) {
    this.games = new Map();
    this.scoreboard = { X: 0, O: 0, draws: 0 };
    this.maxGames = maxGames;
  }

  // ---------- queries ----------

  getGame(id) {
    return this._view(this._find(id));
  }

  getScoreboard() {
    return { ...this.scoreboard };
  }

  // ---------- commands ----------

  createGame(mode = 'TwoPlayer') {
    if (!MODES.includes(mode)) {
      throw new GameError('INVALID_MODE', `Mode must be one of: ${MODES.join(', ')}.`, 400);
    }
    const game = { id: randomUUID(), mode, moves: [], countedResult: null };
    this.games.set(game.id, game);
    // Keep memory bounded: drop the oldest game once the cap is exceeded.
    while (this.games.size > this.maxGames) {
      this.games.delete(this.games.keys().next().value);
    }
    return this._view(game);
  }

  makeMove(id, request = {}) {
    const game = this._find(id);
    const { player } = request;
    const cell = this._resolveCell(request);

    if (!PLAYERS.includes(player)) {
      throw new GameError('INVALID_PLAYER', 'Player must be "X" or "O".', 400);
    }
    if (evaluateBoard(buildBoard(game.moves)).status !== 'InProgress') {
      throw new GameError('GAME_OVER', 'This game is over. Reset the game to play again.', 409);
    }
    if (game.mode === 'Computer' && player === COMPUTER) {
      throw new GameError('WRONG_TURN', 'In Computer mode, O is played by the computer.', 409);
    }
    const expected = this._nextPlayer(game);
    if (player !== expected) {
      throw new GameError('WRONG_TURN', `It is ${expected}'s turn.`, 409);
    }
    if (buildBoard(game.moves)[cell] !== null) {
      throw new GameError('CELL_OCCUPIED', 'That cell is already taken. Pick an empty cell.', 409);
    }

    this._push(game, cell);

    // The computer replies automatically, but only while the game is still running.
    const board = buildBoard(game.moves);
    if (game.mode === 'Computer' && evaluateBoard(board).status === 'InProgress') {
      this._push(game, chooseComputerMove(board, COMPUTER, HUMAN));
    }

    this._syncScore(game);
    return this._view(game);
  }

  undo(id) {
    const game = this._find(id);
    if (game.moves.length === 0) {
      throw new GameError('NOTHING_TO_UNDO', 'There are no moves to undo.', 409);
    }
    const removed = game.moves.pop();
    // Computer mode: remove the computer's move together with the human move before it.
    // (If the human's move ended the game the computer never replied, so only that move goes.)
    if (game.mode === 'Computer' && removed.player === COMPUTER && game.moves.length > 0) {
      game.moves.pop();
    }
    this._syncScore(game);
    return this._view(game);
  }

  resetGame(id) {
    const game = this._find(id);
    game.moves = [];
    game.countedResult = null; // the scoreboard is intentionally left unchanged
    return this._view(game);
  }

  resetScoreboard() {
    // Games keep their countedResult: a finished game on screen was already counted once
    // and must not be added again after the reset.
    this.scoreboard = { X: 0, O: 0, draws: 0 };
    return this.getScoreboard();
  }

  // ---------- internals ----------

  _find(id) {
    const game = this.games.get(id);
    if (!game) throw notFound(id);
    return game;
  }

  _nextPlayer(game) {
    const last = game.moves[game.moves.length - 1];
    return last ? otherPlayer(last.player) : 'X';
  }

  /** Accepts { index } (0-8) or { row, column } (1-3, as shown in the move history). */
  _resolveCell({ index, row, column }) {
    const bad = (msg) => new GameError('OUT_OF_BOUNDS', msg, 400);
    if (index !== undefined) {
      if (!Number.isInteger(index) || index < 0 || index > 8) throw bad('Cell index must be an integer from 0 to 8.');
      return index;
    }
    if (row !== undefined && column !== undefined) {
      const ok = (n) => Number.isInteger(n) && n >= 1 && n <= 3;
      if (!ok(row) || !ok(column)) throw bad('Row and column must be integers from 1 to 3.');
      return (row - 1) * 3 + (column - 1);
    }
    throw bad('Provide either "index" or both "row" and "column".');
  }

  _push(game, index) {
    const { row, column } = toPosition(index);
    game.moves.push({
      moveNumber: game.moves.length + 1,
      player: this._nextPlayer(game),
      index,
      row,
      column,
    });
  }

  /** Make the scoreboard reflect this game's result exactly once. */
  _syncScore(game) {
    const { status, winner } = evaluateBoard(buildBoard(game.moves));
    const result = status === 'Won' ? winner : status === 'Draw' ? 'draws' : null;
    if (result === game.countedResult) return;
    if (game.countedResult) {
      this.scoreboard[game.countedResult] = Math.max(0, this.scoreboard[game.countedResult] - 1);
    }
    if (result) this.scoreboard[result] += 1;
    game.countedResult = result;
  }

  _view(game) {
    const board = buildBoard(game.moves);
    const result = evaluateBoard(board);
    return {
      id: game.id,
      mode: game.mode,
      board,
      currentPlayer: this._nextPlayer(game),
      status: result.status,
      winner: result.winner,
      winningCells: result.winningCells,
      moves: game.moves.map((m) => ({ ...m })),
      canUndo: game.moves.length > 0,
      scoreboard: this.getScoreboard(),
    };
  }
}

module.exports = { GameService, GameError, MODES };
