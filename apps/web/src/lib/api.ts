const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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
    let response = await fetch(url, config);

    // If 401 Unauthorized, try refreshing token once
    if (response.status === 401 && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/register') {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
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
