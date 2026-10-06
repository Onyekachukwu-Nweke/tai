import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { authConfigured, createAuth } from "../apps/worker/src/auth";

describe("Google identity storage", () => {
  it("requires a canonical secure origin and complete credentials", () => {
    expect(authConfigured(env)).toBe(true);
    expect(authConfigured({ ...env, APP_ORIGIN: "http://tai.example" })).toBe(
      false,
    );
    expect(authConfigured({ ...env, APP_ORIGIN: `${env.APP_ORIGIN}/` })).toBe(
      false,
    );
    expect(authConfigured({ ...env, BETTER_AUTH_SECRET: "short" })).toBe(false);
  });

  it("creates auth records using the real adapter and removes unnecessary profile and token data", async () => {
    const context = await createAuth(env).$context;
    const { user } = await context.internalAdapter.createOAuthUser(
      {
        name: "Synthetic learner",
        email: "privacy@example.test",
        emailVerified: true,
        image: "https://example.test/avatar.png",
      },
      {
        accountId: "synthetic-google-id",
        providerId: "google",
        accessToken: "synthetic-access-token",
        refreshToken: "synthetic-refresh-token",
        idToken: "synthetic-id-token",
        scope: "profile email",
      },
    );
    await context.internalAdapter.createSession(user.id, false, {
      ipAddress: "192.0.2.1",
      userAgent: "Synthetic browser",
    });
    const storedUser = await env.DB.prepare(
      "SELECT image FROM user WHERE id = ?",
    )
      .bind(user.id)
      .first();
    const account = await env.DB.prepare(
      "SELECT accessToken, refreshToken, idToken, scope FROM account WHERE userId = ?",
    )
      .bind(user.id)
      .first();
    const session = await env.DB.prepare(
      "SELECT ipAddress, userAgent FROM session WHERE userId = ?",
    )
      .bind(user.id)
      .first();
    expect(storedUser).toEqual({ image: null });
    expect(account).toEqual({
      accessToken: null,
      refreshToken: null,
      idToken: null,
      scope: null,
    });
    expect(session).toEqual({ ipAddress: null, userAgent: null });
  });
});
