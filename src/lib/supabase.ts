const SUPABASE_URL = 'https://rymtqnlhhcmltvqytskq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7saixITTenNNj7BPQcDLyQ_Kn8KqtQF';
const SESSION_KEY = 'mindora-auth-session';

export type CloudUser = { id: string; email?: string };
type Session = { access_token: string; refresh_token: string; expires_at: number; user: CloudUser };

function readSession(): Session | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as Session : null;
  } catch {
    return null;
  }
}
function saveSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}
async function authRequest(path: string, body?: unknown, token?: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || 'Authentication request failed.');
  return data;
}
async function currentSession(): Promise<Session | null> {
  let session = readSession();
  if (!session) return null;
  if (session.expires_at < Math.floor(Date.now() / 1000) + 45) {
    try {
      const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
      session = { ...refreshed, expires_at: Math.floor(Date.now() / 1000) + Number(refreshed.expires_in ?? 3600), user: refreshed.user ?? session.user };
      saveSession(session);
    } catch {
      saveSession(null);
      return null;
    }
  }
  return session;
}
export async function getCloudUser(): Promise<CloudUser | null> {
  const session = await currentSession();
  return session?.user ?? null;
}
export async function signIn(email: string, password: string): Promise<CloudUser> {
  const data = await authRequest('token?grant_type=password', { email: email.trim(), password });
  const session: Session = { ...data, expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600) };
  saveSession(session);
  return session.user;
}
export async function signUp(email: string, password: string): Promise<{ user: CloudUser; needsConfirmation: boolean }> {
  const data = await authRequest('signup', { email: email.trim(), password });
  if (data.access_token) {
    const session: Session = { ...data, expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600) };
    saveSession(session);
  }
  return { user: data.user, needsConfirmation: !data.access_token };
}
export async function signOut(): Promise<void> {
  const session = await currentSession();
  try {
    if (session) await authRequest('logout', {}, session.access_token);
  } finally {
    saveSession(null);
  }
}
async function api(path: string, options: RequestInit = {}) {
  const session = await currentSession();
  if (!session) throw new Error('Sign in to use cloud sync.');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.details || data.hint || 'Cloud request failed.');
  }
  return response;
}
export async function upsertCloud(table: 'subjects' | 'materials', rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  await api(`${table}?on_conflict=id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}
export async function fetchCloudRows(table: 'subjects' | 'materials', userId: string) {
  const response = await api(`${table}?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`);
  return await response.json() as Record<string, unknown>[];
}
export async function uploadCloudFile(path: string, file: Blob, contentType: string) {
  const session = await currentSession();
  if (!session) throw new Error('Sign in to upload study files.');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/study-materials/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': contentType || 'application/octet-stream', 'x-upsert': 'true' },
    body: file,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Could not upload your file to cloud storage.');
  }
}
export async function downloadCloudFile(path: string): Promise<Blob> {
  const session = await currentSession();
  if (!session) throw new Error('Sign in to download study files.');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/study-materials/${path.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error('Could not download a synced study image.');
  return await response.blob();
}
export async function deleteCloudMaterial(id: string) {
  await api(`materials?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export async function deleteCloudSubject(id: string) {
  await api(`subjects?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export async function deleteCloudFile(path: string) {
  const session = await currentSession();
  if (!session) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/study-materials`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] }),
  });
}
