import type { Plugin } from 'vite';
import type { ServerResponse } from 'node:http';
import pool from './db.ts';
import { handlePlacesRequest } from './placesApi.mjs';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/**
 * Expone /api/places/* en el servidor de desarrollo de Vite.
 * En produccion las mismas rutas las atiende server/standalone.mjs.
 */
export function placesPlugin(): Plugin {
  return {
    name: 'foodlink-places-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/places')) return next();
        const url = new URL(req.url, 'http://localhost');
        const handled = await handlePlacesRequest(req, res, url, pool, sendJson);
        if (!handled) next();
      });
    }
  };
}
