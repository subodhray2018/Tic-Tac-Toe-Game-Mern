'use strict';

/**
 * Pure game rules: no state, no I/O, so everything here is easy to unit test.
 * Board cells are indexed 0..8, left-to-right, top-to-bottom:
 *   0 1 2
 *   3 4 5
 *   6 7 8
 */

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

const HUMAN = 'X';
const COMPUTER = 'O';

function otherPlayer(player) {
  return player === 'X' ? 'O' : 'X';
}

/** Rebuild the board from the ordered move list (the move list is the source of truth). */
function buildBoard(moves) {
  const board = Array(9).fill(null);
  for (const move of moves) board[move.index] = move.player;
  return board;
}

/** Returns { status: 'Won' | 'Draw' | 'InProgress', winner, winningCells }. */
function evaluateBoard(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { status: 'Won', winner: board[a], winningCells: line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { status: 'Draw', winner: null, winningCells: null };
  }
  return { status: 'InProgress', winner: null, winningCells: null };
}

/** Finds an empty cell that would complete a line for `player`, or -1. */
function findCompletingMove(board, player) {
  for (const line of WIN_LINES) {
    const marks = line.filter((i) => board[i] === player).length;
    const empties = line.filter((i) => board[i] === null);
    if (marks === 2 && empties.length === 1) return empties[0];
  }
  return -1;
}

/**
 * Computer move priority (as specified):
 *   1. win  2. block  3. center  4. corner  5. any empty cell
 * Returns a cell index, or -1 when the board is full.
 */
function chooseComputerMove(board, computer = COMPUTER, human = HUMAN) {
  const win = findCompletingMove(board, computer);
  if (win !== -1) return win;

  const block = findCompletingMove(board, human);
  if (block !== -1) return block;

  if (board[4] === null) return 4;

  const corner = [0, 2, 6, 8].find((i) => board[i] === null);
  if (corner !== undefined) return corner;

  return board.findIndex((cell) => cell === null);
}

/** Human-friendly 1-based position for the move history. */
function toPosition(index) {
  return { row: Math.floor(index / 3) + 1, column: (index % 3) + 1 };
}

module.exports = {
  WIN_LINES, HUMAN, COMPUTER, otherPlayer, buildBoard,
  evaluateBoard, findCompletingMove, chooseComputerMove, toPosition,
};
