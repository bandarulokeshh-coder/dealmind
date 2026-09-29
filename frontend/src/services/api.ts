const BASE = import.meta.env.VITE_API_URL ?? ""

function url(path: string) {
  return path.startsWith("/api") && BASE ? `${BASE}${path}` : path
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(url(path), {
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
    body: opts.body ? opts.body : undefined,
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `${r.status} ${r.statusText}`)
  }
  return r.json() as Promise<T>
}

export const get = <T>(p: string, init?: RequestInit) => api<T>(p, init)
export const post = <T>(p: string, body: unknown, init?: RequestInit) =>
  api<T>(p, { method: "POST", body: JSON.stringify(body), ...init })
export const put = <T>(p: string, body: unknown, init?: RequestInit) =>
  api<T>(p, { method: "PUT", body: JSON.stringify(body), ...init })
export const del = <T>(p: string, init?: RequestInit) =>
  api<T>(p, { method: "DELETE", ...init })
