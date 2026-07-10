/**
 * Constructs the API base URL.
 * - In Replit: uses EXPO_PUBLIC_DOMAIN (the proxied dev domain)
 * - Fallback: localhost:8080 for local development outside Replit
 */
export function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api`;
  }
  return 'http://localhost:8080/api';
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown>;
  token?: string | null;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, token, ...init } = options;
  const url = `${getApiBase()}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error ?? 'Something went wrong', response.status, data);
  }

  return data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
