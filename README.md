# Tic Tac Toe

## 1. Project overview

A browser-based Tic Tac Toe game with a **React** frontend and a **Node.js (Express)** REST backend that runs locally. The backend owns every game rule and all state (games, move history, status, scoreboard). The frontend only renders what the API returns and sends the player's clicks.

Two modes: **Two Player** and **Play Against Computer** (human is X, computer is O).

## 2. Tech stack

| Layer     | Choice |
|-----------|--------|
| Frontend  | React 18, Vite, Framer Motion (animation), react-hot-toast (error toasts), canvas-confetti (win celebration) |
| Backend   | Node.js 18+, Express 4, cors |
| API style | REST + JSON |
| Storage   | In-memory (per server process) |
| Tests     | Node's built-in test runner (`node:test`), no extra dependencies |
| Source control | Git / GitHub |

## 3. Features implemented

- 3 x 3 board; empty cells clickable, filled cells locked; X/O drawn on the board
- Turn display, alternating turns, invalid moves never change the turn
- Win detection (row, column, diagonal) with highlighted winning cells; draw detection
- Moves blocked after the game is complete
- Move history table (move number, player, row/column)
- Undo last move, mode-aware (see Clarifications), disabled when there is nothing to undo
- Session scoreboard (X wins, O wins, draws), served by the backend; Reset Game keeps it, separate Reset Scoreboard
- Computer opponent with the required priority: win, block, centre, corner, any cell
- Multiple independent game sessions; the browser resumes its game after a refresh (game id kept in `localStorage`)

## 4. Run the backend locally

Requires Node 18+.

```bash
cd server
npm install
npm start          # http://localhost:3001  (set PORT to change)
```

## 5. Run the frontend locally

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:3001`, so start the backend first. Shortcut from the repo root: `npm run install:all` then `npm run dev` starts both.

## 6. API endpoint summary

Base path: `/api`. All bodies are JSON.

| Method | Endpoint | Body | Purpose | Success |
|--------|----------|------|---------|---------|
| POST | `/games` | `{ "mode": "TwoPlayer" \| "Computer" }` (optional, default `TwoPlayer`) | Create a game session | `201` game state |
| GET | `/games/{id}` | | Get current game state | `200` game state |
| POST | `/games/{id}/moves` | `{ "player": "X"\|"O", "index": 0-8 }` **or** `{ "player", "row": 1-3, "column": 1-3 }` | Submit a move (in Computer mode the reply is made in the same call) | `200` game state |
| POST | `/games/{id}/undo` | | Undo (mode-aware) | `200` game state |
| POST | `/games/{id}/reset` | | Clear the board, history and status; same id and mode; scoreboard unchanged | `200` game state |
| GET | `/scoreboard` | | Get scoreboard | `200` `{ X, O, draws }` |
| POST | `/scoreboard/reset` | | Reset scoreboard | `200` `{ X, O, draws }` |
| GET | `/health` | | Liveness check | `200` `{ ok: true }` |

Cell index layout: `0 1 2 / 3 4 5 / 6 7 8`. `row` and `column` are 1-based, matching the move history.

### Game state response

```json
{
  "id": "6f0c1c52-...",
  "mode": "TwoPlayer",
  "board": ["X", null, null, null, "O", null, null, null, null],
  "currentPlayer": "X",
  "status": "InProgress",
  "winner": null,
  "winningCells": null,
  "moves": [
    { "moveNumber": 1, "player": "X", "index": 0, "row": 1, "column": 1 },
    { "moveNumber": 2, "player": "O", "index": 4, "row": 2, "column": 2 }
  ],
  "canUndo": true,
  "scoreboard": { "X": 0, "O": 0, "draws": 0 }
}
```

`status` is `InProgress`, `Won` or `Draw`. `winner` is `"X"`, `"O"` or `null`. `winningCells` is an array of 3 indices when won, otherwise `null`.

### Errors

Shape: `{ "error": "human readable message", "code": "MACHINE_CODE" }`. A rejected request never changes game state.

| HTTP | code | When |
|------|------|------|
| 400 | `OUT_OF_BOUNDS` | Index/row/column outside the board, not an integer, or missing |
| 400 | `INVALID_PLAYER` | `player` missing or not `X`/`O` |
| 400 | `INVALID_MODE` | Unknown mode on create |
| 400 | `BAD_JSON` | Malformed request body |
| 404 | `GAME_NOT_FOUND` | Unknown game id |
| 409 | `CELL_OCCUPIED` | Cell already taken |
| 409 | `GAME_OVER` | Move after a win or draw |
| 409 | `WRONG_TURN` | Wrong player (including O in Computer mode) |
| 409 | `NOTHING_TO_UNDO` | Undo with an empty history |

## 7. Run the tests

```bash
cd server
npm test           # or, from the repo root: npm test
```

44 tests across two files:

- `test/gameLogic.test.js`: pure rules (row/column/diagonal wins, draw, in-progress, each computer priority rule, win-before-block).
- `test/gameService.test.js`: state transitions (valid and invalid moves, turn switching, wrong player, move after completion, reset, undo in both modes, scoreboard updates and undo-after-completion, computer replies/win/draw, game isolation, eviction).

The Express layer (`src/app.js`) is intentionally thin: it maps routes to `GameService` methods and `GameError`s to status codes, so the rules are tested without an HTTP server. There are no frontend tests yet (see Future improvements).

## 8. AI tools and prompt summary

**Tool:** Claude (Anthropic) used as a pair-programmer.

**Workflow**
1. Gave Claude the problem statement and asked for a React + Node implementation with in-memory storage.
2. Asked for a UI with third-party components so it feels smooth; Claude proposed Framer Motion, react-hot-toast and canvas-confetti.
3. Pasted the extended backend requirements (multi-game REST contract, move validation incl. wrong player, status values, README and test expectations) and asked Claude to restructure the API, tests and docs to match.

**What the AI generated:** the project structure, game rules, service layer, REST routes, React components, styling, unit tests and this README.

**Review checklist for the panel** (what I should be able to walk through): the derived-state design in `GameService`, the undo rules per mode, the idempotent `_syncScore`, the validation order in `makeMove`, and the computer priority logic.

> Add your own notes here before submitting: prompts you actually used, what you changed by hand, and what you verified yourself.

## 9. Design decisions

- **Move list is the source of truth.** Board, turn, status, winner and winning cells are derived from `moves` on every read. Undo only pops moves, so state can never go out of sync.
- **Backend owns the rules.** The UI never decides validity, winners or the computer's move. The computer's reply happens inside the `POST .../moves` call, so the client makes one request per click.
- **Pure logic separate from state.** `gameLogic.js` has no state or I/O; `gameService.js` handles sessions; `app.js` is only HTTP wiring.
- **Stable error codes** alongside messages, so clients and tests don't depend on wording.
- **Idempotent scoring.** `_syncScore` compares the game's current result with what it already contributed, so a result is counted once no matter how many requests arrive.
- **Memory is bounded**: at most 100 games are kept; the oldest is dropped first.
- **Frontend:** a single `run()` wrapper applies whatever state the server returns and shows errors as toasts, then the UI is a pure function of that state.

## 10. Clarifications and assumptions

- **Scoreboard and Undo: Option B (undo allowed after completion).** After a win or draw, Undo stays enabled. If it reverses the result, that result is removed from the scoreboard; finishing the game again adds it once. Reset Scoreboard does not re-count a finished game still on screen.
- **Undo, Two Player:** removes only the most recent move.
- **Undo, Computer:** removes the computer's last move and the human move before it. If the human's move ended the game (the computer never replied), only that single move is removed.
- Human is always X in Computer mode; submitting a move as O there is rejected.
- Changing mode in the UI creates a **new game** (scoreboard is shared and kept).
- The scoreboard is session-level and shared by all games on this server.
- `player` is required on every move request and is validated against whose turn it is, even though the UI always sends the current player.
- Computer corner choice is deterministic: first free of 0, 2, 6, 8. "Any cell" is the first free index.

## 11. Known limitations

- In-memory only: restarting the server loses all games and the scoreboard.
- No authentication; the scoreboard is global to the server rather than per user.
- No real-time sync: two browsers on the same game id would only see each other's moves after a refresh.
- The computer follows the specified priority rules and is not a perfect (minimax) player.
- No frontend automated tests.

## 12. Future improvements

- MongoDB (or SQLite) persistence behind the same `GameService` interface
- Per-user scoreboards and sessions
- Frontend tests (React Testing Library for components, mocked `fetch` for `api.js`) and HTTP-level API tests
- Difficulty levels (minimax "hard" mode)
- Redo, replay of finished games, WebSocket/SSE for live two-device play
- Dockerfile / docker-compose for one-command startup
