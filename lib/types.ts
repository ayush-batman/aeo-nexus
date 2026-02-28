// Database Types for AEO Nexus

export interface Organization {
    id: string;
    name: string;
    plan: 'free' | 'starter' | 'pro' | 'agency' | 'enterprise';
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    razorpay_subscription_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    org_id: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    is_super_admin: boolean;
    created_at: string;
}

export interface Workspace {
    id: string;
    org_id: string;
    name: string; // Brand name
    logo_url: string | null;
    settings: WorkspaceSettings;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceSettings {
    default_tone?: string;
    auto_scan_enabled?: boolean;
    scan_frequency?: 'daily' | 'weekly' | 'monthly';
    notification_email?: string;
    industry?: string;
    target_audience?: string;
}

export interface Product {
    id: string;
    workspace_id: string;
    name: string;
    website: string | null;
    description: string | null;
    keywords: string[];
    competitors: Competitor[];
    knowledge_base: KnowledgeBase;
    created_at: string;
    updated_at: string;
}

export interface Competitor {
    name: string;
    website?: string;
    weaknesses?: string[];
}

export interface KnowledgeBase {
    key_specs?: Record<string, string>;
    usps?: string[];
    price_range?: string;
    use_cases?: string[];
    authentic_angles?: string[];
}

// LLM Tracking Types
export interface LLMScan {
    id: string;
    workspace_id: string;
    platform: 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'google_ai' | 'bing_copilot';
    prompt: string;
    response: string;
    brand_mentioned: boolean;
    mention_position: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    competitors_mentioned: string[];
    citations: Citation[];
    created_at: string;
}

export interface Citation {
    url: string;
    title: string;
    is_own_domain: boolean;
}

// Forum Types
export interface ForumThread {
    id: string;
    workspace_id: string;
    platform: 'reddit' | 'quora' | 'teambhp' | 'xbhp' | 'youtube' | 'other';
    external_id: string;
    url: string;
    title: string;
    text: string | null;
    subreddit: string | null;
    author: string | null;
    score: number;
    num_comments: number;
    opportunity_score: number;
    score_breakdown: ScoreBreakdown;
    product_id: string | null;
    status: 'discovered' | 'queued' | 'drafted' | 'posted' | 'skipped';
    comment_draft: string | null;
    posted_at: string | null;
    posted_by: string | null;
    discovered_at: string | null;
    external_created_at: string | null;
    created_at: string;
}

export interface ScoreBreakdown {
    recency: number;
    engagement: number;
    intent: number;
    intent_type: string;
    subreddit_quality: number;
    competition: number;
}

// Reddit Account Types
export interface RedditAccount {
    id: string;
    org_id: string;
    username: string;
    posts_today: number;
    last_post_at: string | null;
    created_at: string;
}

// Content Analysis Types
export interface ContentAnalysis {
    id: string;
    workspace_id: string;
    url: string;
    title: string;
    aeo_score: number;
    readability_score: number;
    eeat_score: number;
    schema_present: string[];
    recommendations: string[];
    created_at: string;
}

// Analytics Types
export interface VisibilityMetric {
    date: string;
    platform: string;
    visibility_score: number;
    mention_count: number;
    sentiment_positive: number;
    sentiment_neutral: number;
    sentiment_negative: number;
}

export interface ShareOfVoice {
    brand: string;
    percentage: number;
    mention_count: number;
}

// API Response Types
export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
}
