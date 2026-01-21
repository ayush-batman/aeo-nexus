declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // Stripe
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;

    // AI Services
    OPENAI_API_KEY: string;
    GOOGLE_API_KEY: string;

    // Reddit API
    REDDIT_CLIENT_ID?: string;
    REDDIT_CLIENT_SECRET?: string;

    // App
    NEXT_PUBLIC_APP_URL: string;
  }
}
