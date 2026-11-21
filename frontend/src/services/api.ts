const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type RecordItem = {
  id: string;
  title: string;
  details: string;
  createdAt: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getRecords(): Promise<RecordItem[]> {
  const result = await request<{ records: RecordItem[] }>('/v1/records');
  return result.records;
}

export async function createRecord(title: string, details: string): Promise<RecordItem> {
  const result = await request<{ record: RecordItem }>('/v1/records', {
    method: 'POST',
    body: JSON.stringify({ title, details }),
  });
  return result.record;
}

export async function deleteRecord(id: string): Promise<void> {
  await request<void>(`/v1/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
