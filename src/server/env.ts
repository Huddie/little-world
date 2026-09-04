export interface Env {
  DB: D1Database;
  BOOK_ASSETS: R2Bucket;
  BROWSER: Fetcher;
  ASSETS: Fetcher;
  GENERATE_BOOK_WORKFLOW: Workflow<{ bookIssueId: string }>;
  BUILD_WORLD_WORKFLOW: Workflow<{ childId: string; firstIssueId: string }>;
  APP_BASE_URL: string;
  OPENAI_API_KEY?: string;
  OPENAI_STORY_MODEL?: string;
  OPENAI_FAST_MODEL?: string;
  OPENAI_IMAGE_MODEL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL: string;
  BETTER_AUTH_SECRET?: string;
  ADMIN_EMAILS?: string;
  ENABLE_CLOUDFLARE_ACCESS_AUTH?: string;
}
