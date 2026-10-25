'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateBoard, chooseComputerMove, toPosition } = require('../src/gameLogic');

const E = null;

test('row win is detected with winning cells', () => {
  const r = evaluateBoard(['X', 'X', 'X', E, 'O', 'O', E, E, E]);
  assert.deepEqual(r, { status: 'Won', winner: 'X', winningCells: [0, 1, 2] });
});

test('column win is detected', () => {
  const r = evaluateBoard(['O', 'X', E, 'O', 'X', E, 'O', E, 'X']);
  assert.equal(r.winner, 'O');
  assert.deepEqual(r.winningCells, [0, 3, 6]);
});

test('both diagonals win', () => {
  assert.deepEqual(evaluateBoard(['X', 'O', E, 'O', 'X', E, E, E, 'X']).winningCells, [0, 4, 8]);
  assert.deepEqual(evaluateBoard([E, 'O', 'X', 'O', 'X', E, 'X', E, E]).winningCells, [2, 4, 6]);
});

test('full board without a line is a draw', () => {
  assert.equal(evaluateBoard(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']).status, 'Draw');
});

test('empty and partial boards are in progress', () => {
  assert.equal(evaluateBoard(Array(9).fill(E)).status, 'InProgress');
  assert.equal(evaluateBoard(['X', E, E, E, 'O', E, E, E, E]).status, 'InProgress');
});

test('computer priority 1: wins when it can', () => {
  assert.equal(chooseComputerMove(['O', 'O', E, 'X', 'X', E, E, E, E]), 2);
});

test('computer priority 2: blocks X when it cannot win', () => {
  assert.equal(chooseComputerMove(['X', 'X', E, E, 'O', E, E, E, E]), 2);
});

test('computer priority 3: takes the centre', () => {
  assert.equal(chooseComputerMove(['X', E, E, E, E, E, E, E, E]), 4);
});

test('computer priority 4: takes the first free corner', () => {
  assert.equal(chooseComputerMove([E, 'X', E, E, 'O', E, E, E, E]), 0);
  assert.equal(chooseComputerMove(['X', E, E, E, 'O', E, E, E, E]), 2); // 0 is taken, next free corner
});

test('computer priority 5: falls back to any free cell', () => {
  assert.equal(chooseComputerMove(['X', E, 'O', 'O', 'X', 'X', 'X', 'O', 'O']), 1);
});

test('computer prefers winning over blocking', () => {
  // O can win at 5; X threatens at 2. Winning must come first.
  assert.equal(chooseComputerMove(['X', 'X', E, 'O', 'O', E, E, E, E]), 5);
});

test('toPosition is 1-based', () => {
  assert.deepEqual(toPosition(0), { row: 1, column: 1 });
  assert.deepEqual(toPosition(5), { row: 2, column: 3 });
  assert.deepEqual(toPosition(8), { row: 3, column: 3 });
});
