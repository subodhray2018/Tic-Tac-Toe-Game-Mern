'use strict';

const express = require('express');
const cors = require('cors');
const { GameService, GameError } = require('./gameService');

/**
 * REST API. Game endpoints return the full game state (including the scoreboard).
 * Errors: { error: "message", code: "MACHINE_CODE" } with 400 / 404 / 409.
 * See the README for the full contract.
 */
function createApp(service = new GameService()) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/games', (req, res) => {
    const mode = req.body ? req.body.mode : undefined;
    res.status(201).json(service.createGame(mode));
  });

  app.get('/api/games/:id', (req, res) => res.json(service.getGame(req.params.id)));

  app.post('/api/games/:id/moves', (req, res) => {
    res.json(service.makeMove(req.params.id, req.body || {}));
  });

  app.post('/api/games/:id/undo', (req, res) => res.json(service.undo(req.params.id)));

  app.post('/api/games/:id/reset', (req, res) => res.json(service.resetGame(req.params.id)));

  app.get('/api/scoreboard', (_req, res) => res.json(service.getScoreboard()));

  app.post('/api/scoreboard/reset', (_req, res) => res.json(service.resetScoreboard()));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route.', code: 'NOT_FOUND' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof GameError) return res.status(err.status).json({ error: err.message, code: err.code });
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON.', code: 'BAD_JSON' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong on the server.', code: 'SERVER_ERROR' });
  });

  return app;
}

module.exports = { createApp };
