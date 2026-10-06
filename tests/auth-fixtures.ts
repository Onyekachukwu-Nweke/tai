import { env } from "cloudflare:test";

export async function seedSession(
  userId: string,
  expired = false,
): Promise<string> {
  const now = new Date().toISOString();
  const token = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)",
  )
    .bind(userId, `Learner ${userId}`, `${userId}@example.test`, now, now)
    .run();
  await env.DB.prepare(
    "INSERT INTO session (id, userId, token, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      crypto.randomUUID(),
      userId,
      token,
      new Date(Date.now() + (expired ? -1000 : 3600000)).toISOString(),
      now,
      now,
    )
    .run();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.BETTER_AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token),
  );
  const encoded = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `better-auth.session_token=${encodeURIComponent(`${token}.${encoded}`)}`;
}
