
# Launch Readiness Checklist

## 1. Core Feature Verification
- [ ] **Authentication** (Signup/Login/Logout via Supabase)
    - [x] Markup & Routing
    - [ ] **CRITICAL FAILURE**: `Unable to validate email address: invalid format` error on Signup. Requires Supabase project config check.
- [x] **Dashboard Layout** (Sidebar, Header, Navigation)
- [ ] **Forum Hub** - *Pending Auth Fix*
    - [ ] Dynamic User Testing blocked by Auth
    - [x] Smart Source Discovery (Verified code)
- [ ] **Content Auditor** - *Pending Auth Fix*
    - [x] Verified `/api/audit` endpoint logic (Code Review)
- [ ] **Competitor Battle** - *Pending Auth Fix*
    - [x] Verified `/api/llm/scans` handles 'battle' mode (Code Review)
- [ ] **LLM Scanner** - *Pending Auth Fix*

## 2. Monetization & Onboarding
- [ ] **Payments (Razorpay/Stripe)**
    - [ ] Verify "Get Started" links trigger payment or free trial
    - [ ] Check Upgrade flows in Settings
- [ ] **Onboarding Flow**
    - [ ] Check redirect after signup (Does it go to onboarding or dashboard?)
    - [ ] Verify Workspace creation

## 3. SEO & Polish
- [ ] **Metadata**: Title, Description, OG Tags for all public pages
- [ ] **Landing Page**: Verify links and responsiveness
- [ ] **Error Handling**: Check 404 and Error pages

## 4. Deployment
- [ ] **Environment Variables**: Ensure all keys (Reddit, YouTube, Gemini, Supabase) are in Vercel/Production env.
- [ ] **Build Check**: Run `npm run build` locally to catch type errors.

## Action Plan
1.  **URGENT**: Fix Signup/Auth issue. (Added `.trim()`, but likely needs Supabase Admin check).
2.  **Verify Content Auditor** via Browser once Auth is fixed.
3.  **Run Build** verification.
