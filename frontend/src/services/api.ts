export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts, body: opts.body ? opts.body : undefined })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
export const get = <T>(p: string) => api<T>(p)
export const post = <T>(p: string, body: any) => api<T>(p, { method: "POST", body: JSON.stringify(body) })
