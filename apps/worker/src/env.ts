export interface Env {
  DB: D1Database;
  ORIGINALS: R2Bucket;
  APP_ORIGIN: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RETURN_GAP_DAYS?: string;
  AI_CALLS_ENABLED?: string;
  AI_DAILY_TOTAL_LIMIT?: string;
  AI_DAILY_CONCEPT_LIMIT?: string;
  AI_DAILY_PACK_LIMIT?: string;
  AI_DAILY_GRADING_LIMIT?: string;
  AI_DAILY_SUPPORT_LIMIT?: string;
  AI_DAILY_PRACTICAL_LIMIT?: string;
}

export interface Variables {
  user: { id: string; name: string; email: string };
}
