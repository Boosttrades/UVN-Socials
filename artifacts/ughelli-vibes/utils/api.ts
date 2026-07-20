/**
 * Constructs the API base URL.
 * Priority order:
 * 1. EXPO_PUBLIC_API_URL — baked in at EAS Build time for preview/production APKs
 * 2. EXPO_PUBLIC_DOMAIN  — injected by the Replit workflow for local dev (Expo Go)
 * 3. localhost:8080      — fallback for running outside Replit
 */
export function getApiBase(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) return apiUrl;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
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
  public readonly code?: string;

  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = typeof data?.code === 'string' ? data.code : undefined;
  }
}
