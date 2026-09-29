import assert from 'node:assert/strict';
import { apiRequest } from '../src/lib/api';

async function main() {
  const original = globalThis.fetch;
  let refreshes = 0, authenticated = false;
  const attempts = new Map<string, number>();
  const response = (status: number) => new Response(JSON.stringify({ success: status === 200 }), { status, headers: { 'Content-Type': 'application/json' } });
  try {
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
  } finally { globalThis.fetch = original; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
