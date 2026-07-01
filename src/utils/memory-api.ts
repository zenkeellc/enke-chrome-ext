/**
 * mem-as-a-service REST wrapper.
 *
 * All functions take a JWT token for auth (Bearer).
 * The caller is responsible for reading the token from chrome.storage.local.
 */

const MEM_API_URL = 'https://mem-api.en.ke';

// ── Types ────────────────────────────────────────────────────

export interface Memory {
  id: string;
  content: string;
  memory_type: 'semantic' | 'episodic' | 'procedural';
  importance: number;
  access_count: number;
  last_accessed_at: string | null;
  ttl_level: 'buffer' | 'working' | 'permanent';
  expires_at: string | null;
  superseded_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SearchResponse {
  results: Memory[];
  query: string;
  count: number;
}

export interface MemoryListResponse {
  results: Memory[];
  count: number;
}

// ── Helpers ──────────────────────────────────────────────────

async function request<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${MEM_API_URL}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const msg = typeof data.message === 'string' ? data.message : res.statusText;
    throw new Error(`[mem-api] ${res.status}: ${msg}`);
  }

  return data as T;
}

// ── Public API ───────────────────────────────────────────────

/** Store a memory. */
export async function remember(
  token: string,
  content: string,
  opts?: {
    memory_type?: 'semantic' | 'episodic' | 'procedural';
    importance?: number;
    ttl_level?: 'buffer' | 'working' | 'permanent';
    metadata?: Record<string, unknown>;
    session_id?: string;
  },
): Promise<Memory> {
  return request<Memory>(token, 'POST', '/api/v1/memories', {
    content,
    memory_type: opts?.memory_type ?? 'semantic',
    importance: opts?.importance ?? 0.5,
    ttl_level: opts?.ttl_level ?? 'permanent',
    metadata: opts?.metadata ?? {},
    session_id: opts?.session_id,
  });
}

/** Recall memories by semantic + keyword search. */
export async function recall(
  token: string,
  query: string,
  opts?: {
    memory_type?: string;
    limit?: number;
    threshold?: number;
  },
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (opts?.memory_type) params.set('type', opts.memory_type);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.threshold) params.set('threshold', String(opts.threshold));
  return request<SearchResponse>(token, 'GET', `/api/v1/memories/search?${params}`);
}

/** List memories, newest first. */
export async function listMemories(
  token: string,
  opts?: { memory_type?: string; limit?: number; offset?: number },
): Promise<MemoryListResponse> {
  const params = new URLSearchParams();
  if (opts?.memory_type) params.set('type', opts.memory_type);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  return request<MemoryListResponse>(token, 'GET', `/api/v1/memories${qs ? `?${qs}` : ''}`);
}

/** Delete a memory by ID. */
export async function forget(token: string, memoryId: string): Promise<{ deleted: boolean; id: string }> {
  return request(token, 'DELETE', `/api/v1/memories/${memoryId}`);
}
