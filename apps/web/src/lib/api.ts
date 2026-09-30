const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
let refreshInFlight: Promise<boolean> | null = null;
let authGeneration = 0;

async function refreshSession(generation: number): Promise<boolean> {
  if (generation !== authGeneration) return true;
  if (!refreshInFlight) {
    const refresh = async () => {
      // A different tab may have already rotated the shared HttpOnly cookies.
      const current = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      const ok = current.ok || (await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })).ok;
      if (ok) authGeneration++;
      return ok;
    };
    refreshInFlight = (async () => typeof navigator !== 'undefined' && navigator.locks
      ? await navigator.locks.request('dfz-session-refresh', refresh)
      : await refresh())().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data?: T; error?: { code: string; message: string; details?: any } }> {
  let url = `${API_BASE}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    if (query) url += `?${query}`;
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Automatically passes and receives HttpOnly cookies
  };

  try {
    const generation = authGeneration;
    let response = await fetch(url, config);

    // If 401 Unauthorized, try refreshing token once
    if (response.status === 401 && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/register') {
      try {
        if (await refreshSession(generation)) {
          // Retry original request
          response = await fetch(url, config);
        }
      } catch {
        // Refresh failed, proceed to return 401
      }
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Network connection failed. Please check your internet.',
      },
    };
  }
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  // Older uploads stored the internal API origin. Route these through the
  // configured public API so protected requests carry the session cookies.
  try {
    const parsed = new URL(url, 'http://dfz.local/');
    if (['http:', 'https:'].includes(parsed.protocol)) {
      const match = parsed.pathname.match(/^\/(?:api\/media\/files|uploads)\/([a-zA-Z0-9_.-]+)$/);
      if (match && !match[1].includes('..')) return `${apiBase}/api/media/files/${match[1]}`;
    }
  } catch { /* Preserve non-URL sources below. */ }
  if (url.startsWith('/api/')) {
    return apiBase ? `${apiBase}${url}` : url;
  }
  if (url.startsWith('api/')) {
    return apiBase ? `${apiBase}/${url}` : `/${url}`;
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
      return url.replace('http://', 'https://');
    }
  }
  return url;
}
