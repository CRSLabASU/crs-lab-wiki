// Upstash Redis, called over its REST API.

// Read the environment on each call (see lib/content.ts). The Vercel
// Marketplace integration names them KV_*; a direct Upstash setup UPSTASH_*.
export function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export async function redis(
  commands: (string | number)[][],
): Promise<unknown[]> {
  const config = redisConfig()!;
  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash Redis error ${res.status}`);
  const results = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = results.find((r) => r.error);
  if (failed) throw new Error(`Upstash Redis error: ${failed.error}`);
  return results.map((r) => r.result);
}
