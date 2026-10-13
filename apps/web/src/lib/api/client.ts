import { ProblemDetail } from '@pawnest/shared';

export class ApiError extends Error {
  public problem: ProblemDetail;

  constructor(problem: ProblemDetail) {
    super(problem.detail || problem.title);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Get double-submit CSRF token from document.cookie if available
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )pn_csrf=([^;]*)/);
    if (match && match[1]) {
      headers.set('X-CSRF-Token', decodeURIComponent(match[1]));
    }
  }

  const url = endpoint.startsWith('/') ? `/api/v1${endpoint}` : `/api/v1/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends httpOnly cookies
  });

  if (!res.ok) {
    let problem: ProblemDetail;
    try {
      problem = await res.json();
    } catch {
      problem = {
        type: 'https://pawnest.example/errors/unknown',
        title: res.statusText || 'Error',
        status: res.status,
        code: 'UNKNOWN_ERROR',
        detail: `Request failed with status ${res.status}`,
      };
    }
    throw new ApiError(problem);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}
