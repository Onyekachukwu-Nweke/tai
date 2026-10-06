import { betterAuth } from "better-auth";
import type { Env } from "./env";

export function authConfigured(env: Env): boolean {
  try {
    const url = new URL(env.APP_ORIGIN);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return (
      (url.protocol === "https:" || (local && url.protocol === "http:")) &&
      url.origin === env.APP_ORIGIN &&
      Boolean(
        env.BETTER_AUTH_SECRET &&
        env.BETTER_AUTH_SECRET.length >= 32 &&
        env.GOOGLE_CLIENT_ID &&
        env.GOOGLE_CLIENT_SECRET,
      )
    );
  } catch {
    return false;
  }
}

export function createAuth(env: Env) {
  if (!authConfigured(env)) throw new Error("Authentication is not configured");
  return betterAuth({
    database: env.DB,
    baseURL: env.APP_ORIGIN,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_ORIGIN],
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    account: { storeStateStrategy: "database", storeAccountCookie: false },
    advanced: { ipAddress: { disableIpTracking: true } },
    logger: { disabled: true },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, image: null } }),
        },
        update: {
          before: async (user) => ({ data: { ...user, image: null } }),
        },
      },
      session: {
        create: {
          before: async (session) => ({
            data: { ...session, ipAddress: null, userAgent: null },
          }),
        },
      },
      account: {
        create: {
          before: async (account) => ({
            data: {
              ...account,
              accessToken: null,
              refreshToken: null,
              idToken: null,
              accessTokenExpiresAt: null,
              refreshTokenExpiresAt: null,
              scope: null,
            },
          }),
        },
        update: {
          before: async (account) => ({
            data: {
              ...account,
              accessToken: null,
              refreshToken: null,
              idToken: null,
              accessTokenExpiresAt: null,
              refreshTokenExpiresAt: null,
              scope: null,
            },
          }),
        },
      },
    },
  });
}
