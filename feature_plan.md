
# Implementation Plan: Brand Auto-Enrichment & Dev Auth Bypass

## Goal
1.  **Brand Auto-Enrichment**: Enable users to enter a URL during onboarding and automatically populate Brand Name, Industry, Description, and Audience using Gemini.
2.  **Dev Auth Bypass**: Allow developers (and QA agents) to access the dashboard on `localhost` without hitting Supabase rate limits/errors, enabling full feature testing.

## User Review Required
> [!IMPORTANT]
> The Auth Bypass will strictly only work when `NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS="true"` is set in `.env.local`. It must NEVER be enabled in production.

## Proposed Changes

### 1. Brand Enrichment
#### [NEW] [brand-enrichment.ts](file:///Users/ayush/Desktop/projects/aeo-saas/lib/services/brand-enrichment.ts)
*   Function `enrichBrandFromUrl(url: string)`
*   Uses `read_url_content` (simulated via Gemini's browsing or fetch + Gemini analysis) to extract:
    *   `name`: Brand Name
    *   `industry`: SaaS, E-com, etc.
    *   `description`: Short summary
    *   `audience`: Target audience

#### [NEW] [route.ts](file:///Users/ayush/Desktop/projects/aeo-saas/app/api/brand/enrich/route.ts)
*   API Endpoint `POST /api/brand/enrich` accepting `{ url }`.

#### [MODIFY] [onboarding/page.tsx](file:///Users/ayush/Desktop/projects/aeo-saas/app/(dashboard)/onboarding/page.tsx)
*   Add "Auto-Fill with AI" button next to Website input.
*   Update state with returned values.

### 2. Auth QA Fix
#### [MODIFY] [.env.local](file:///Users/ayush/Desktop/projects/aeo-saas/.env.local)
*   Add `NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS="true"`

#### [MODIFY] [middleware.ts](file:///Users/ayush/Desktop/projects/aeo-saas/middleware.ts)
*   Check for bypass cookie/header on localhost to skip Supabase session validation.

#### [MODIFY] [login/page.tsx](file:///Users/ayush/Desktop/projects/aeo-saas/app/(auth)/login/page.tsx)
*   Add "Dev Login" button (visible only in dev mode) that sets a mock session cookie.

## Verification Plan
1.  **Manual Test**: Use "Dev Login" to access Dashboard.
2.  **Feature Test**: Go to Onboarding -> Enter `https://stripe.com` -> Click "Auto-Fill" -> Verify fields populate.
