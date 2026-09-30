import assert from 'node:assert/strict';
import { apiRequest, resolveMediaUrl } from '../src/lib/api';

async function main() {
  const original = globalThis.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  let refreshes = 0, authenticated = false;
  const attempts = new Map<string, number>();
  const response = (status: number) => new Response(JSON.stringify({ success: status === 200 }), { status, headers: { 'Content-Type': 'application/json' } });
  try {
    for (const apiBase of ['', 'https://api.example.test/']) {
      process.env.NEXT_PUBLIC_API_URL = apiBase;
      const expected = `${apiBase.replace(/\/$/, '')}/api/media/files/private.png`;
      for (const source of ['/api/media/files/private.png', 'api/media/files/private.png', 'http://127.0.0.1:4000/api/media/files/private.png', 'https://old.example.test/uploads/private.png']) {
        assert.equal(resolveMediaUrl(source), expected);
      }
      for (const source of ['blob:preview', 'data:image/png;base64,AA==', 'https://cdn.example.test/photo.png']) {
        assert.equal(resolveMediaUrl(source), source);
      }
      assert.equal(resolveMediaUrl(null), '');
    }
    console.log('PASS media URLs: proxy origin, legacy uploads, separate API, external and preview sources');
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/api/auth/me')) return response(authenticated ? 200 : 401);
      if (url.endsWith('/api/auth/refresh')) {
        refreshes++;
        await new Promise(resolve => setTimeout(resolve, 10));
        authenticated = true;
        return response(200);
      }
      const count = (attempts.get(url) || 0) + 1;
      attempts.set(url, count);
      // One stale 401 arrives after the shared refresh has already finished.
      if (url.endsWith('/late') && count === 1) await new Promise(resolve => setTimeout(resolve, 40));
      return response(count === 1 ? 401 : 200);
    };
    const results = await Promise.all([...Array.from({ length: 8 }, (_, i) => `/api/test/${i}`), '/api/test/late'].map(url => apiRequest(url)));
    assert.ok(results.every(result => result.success));
    assert.equal(refreshes, 1, 'concurrent and late 401 responses must share one rotation');
    assert.ok([...attempts.values()].every(count => count === 2));
    let calls = 0;
    globalThis.fetch = async () => { calls++; return response(401); };
    assert.equal((await apiRequest('/api/auth/login', { method: 'POST' })).success, false);
    assert.equal(calls, 1, 'bad login must not trigger a refresh');
    console.log('PASS API client: concurrent refresh, stale 401, bounded retry, login exclusion');
  } finally {
    globalThis.fetch = original;
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
