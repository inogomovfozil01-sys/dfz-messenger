import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'node:http';
import https from 'node:https';
import { app } from '../../../../api/src/app';

export const config = { api: { bodyParser: false, responseLimit: false, externalResolver: true } };

// One frontend origin for cookies and protected media. The API remains a separate service.
export default function proxy(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.VERCEL && !process.env.API_INTERNAL_URL) {
    return new Promise<void>((resolve) => {
      res.once('finish', resolve);
      res.once('close', resolve);
      app(req as any, res as any);
    });
  }
  const upstream = new URL(process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000');
  const target = new URL(req.url || '/', upstream.origin);
  const client = upstream.protocol === 'https:' ? https : http;
  const request = client.request(target, { method: req.method, headers: { ...req.headers, host: upstream.host }, timeout: 30000 }, response => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });
  request.on('timeout', () => request.destroy(new Error('Upstream timeout')));
  request.on('error', () => { if (!res.headersSent) res.status(502).json({ success: false, error: { code: 'API_UNAVAILABLE', message: 'Сервер временно недоступен' } }); else res.end(); });
  req.pipe(request);
}
