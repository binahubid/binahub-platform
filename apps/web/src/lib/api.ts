const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function getToken(): Promise<string | null> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;
    const supabase = createClient(supabaseUrl, anonKey);
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${API_URL}${path}`, { headers });
  if (!resp.ok) throw new Error((await resp.json().catch(() => ({ error: resp.statusText }))).error || "Request failed");
  return resp.json();
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error((await resp.json().catch(() => ({ error: resp.statusText }))).error || "Request failed");
  return resp.json();
}

export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${API_URL}${path}`, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error((await resp.json().catch(() => ({ error: resp.statusText }))).error || "Request failed");
  return resp.json();
}
