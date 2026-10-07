export interface Env {
  DB: D1Database;
  APP_ORIGIN: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export interface Variables {
  user: { id: string; name: string; email: string };
}
