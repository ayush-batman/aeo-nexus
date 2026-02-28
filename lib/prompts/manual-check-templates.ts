/**
 * Manual LLM Check Prompt Templates
 * 
 * Pre-built prompts organized by buyer journey stage that users can 
 * copy-paste into ChatGPT, Gemini, Perplexity, and Claude to manually
 * verify their brand's AI visibility.
 * 
 * Variables:
 *  {{brand}}    — User's brand name
 *  {{industry}} — User's industry/category
 *  {{product}}  — Specific product/service name
 *  {{audience}} — Target audience description
 */

export interface PromptTemplate {
    id: string;
    category: PromptCategory;
    title: string;
    prompt: string;
    description: string;
    llmTip?: string;
}

export type PromptCategory =
    | 'brand_awareness'
    | 'competitor_comparison'
    | 'problem_solution'
    | 'reviews_reputation'
    | 'category_leaders';

export const CATEGORY_META: Record<PromptCategory, { label: string; icon: string; color: string; description: string }> = {
    brand_awareness: {
        label: 'Brand Awareness',
        icon: '🔍',
        color: 'text-blue-400',
        description: 'Check if LLMs know your brand exists',
    },
    competitor_comparison: {
        label: 'Competitor Comparison',
        icon: '⚔️',
        color: 'text-red-400',
        description: 'See how you stack up against competitors',
    },
    problem_solution: {
        label: 'Problem → Solution',
        icon: '🎯',
        color: 'text-green-400',
        description: 'Check if LLMs recommend you for solving problems',
    },
    reviews_reputation: {
        label: 'Reviews & Reputation',
        icon: '⭐',
        color: 'text-yellow-400',
        description: 'Monitor what LLMs say about your reputation',
    },
    category_leaders: {
        label: 'Category Leaders',
        icon: '🏆',
        color: 'text-purple-400',
        description: 'See if you appear in "best of" and "top" lists',
    },
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
    // ===== BRAND AWARENESS =====
    {
        id: 'ba-1',
        category: 'brand_awareness',
        title: 'Brand Knowledge Check',
        prompt: 'What is {{brand}}? Tell me about this company and what they do.',
        description: 'Tests if the LLM has baseline knowledge of your brand.',
    },
    {
        id: 'ba-2',
        category: 'brand_awareness',
        title: 'Industry Leaders',
        prompt: 'Who are the leading companies in the {{industry}} space?',
        description: 'Checks if your brand appears when LLMs list industry leaders.',
    },
    {
        id: 'ba-3',
        category: 'brand_awareness',
        title: 'Brand Recommendation',
        prompt: 'I\'m looking for a {{industry}} solution. What brands should I consider?',
        description: 'Tests whether LLMs recommend your brand to potential customers.',
    },
    {
        id: 'ba-4',
        category: 'brand_awareness',
        title: 'Startup Discovery',
        prompt: 'What are some innovative companies disrupting the {{industry}} industry?',
        description: 'Checks if LLMs position you as an innovator in your space.',
    },
    {
        id: 'ba-5',
        category: 'brand_awareness',
        title: 'Brand Association',
        prompt: 'When I say "{{industry}}", what brands come to mind and why?',
        description: 'Tests brand-category association strength in LLMs.',
    },
    {
        id: 'ba-6',
        category: 'brand_awareness',
        title: 'Geographic Presence',
        prompt: 'What are the top {{industry}} brands available in India?',
        description: 'Tests regional brand awareness in LLMs.',
        llmTip: 'Change "India" to your target market.',
    },

    // ===== COMPETITOR COMPARISON =====
    {
        id: 'cc-1',
        category: 'competitor_comparison',
        title: 'Head-to-Head Comparison',
        prompt: '{{brand}} vs competitors — which is better for {{audience}}?',
        description: 'Direct comparison query — the most common type users ask LLMs.',
    },
    {
        id: 'cc-2',
        category: 'competitor_comparison',
        title: 'Feature Comparison',
        prompt: 'Compare the features of the top 5 {{industry}} products in 2026.',
        description: 'Checks if your features are accurately represented.',
    },
    {
        id: 'cc-3',
        category: 'competitor_comparison',
        title: 'Price-Value Analysis',
        prompt: 'Which {{industry}} product offers the best value for money?',
        description: 'Tests if LLMs position your brand as good value.',
    },
    {
        id: 'cc-4',
        category: 'competitor_comparison',
        title: 'Switching Intent',
        prompt: 'I\'m currently using [competitor]. Should I switch to {{brand}}?',
        description: 'Checks LLM response to brand switching queries.',
        llmTip: 'Replace [competitor] with your actual competitors.',
    },
    {
        id: 'cc-5',
        category: 'competitor_comparison',
        title: 'Alternatives Search',
        prompt: 'What are the best alternatives to [competitor] for {{audience}}?',
        description: 'Tests if you appear when users search for alternatives.',
        llmTip: 'Replace [competitor] with the market leader.',
    },
    {
        id: 'cc-6',
        category: 'competitor_comparison',
        title: 'Pros and Cons',
        prompt: 'What are the pros and cons of using {{brand}}?',
        description: 'See what LLMs highlight as your strengths and weaknesses.',
    },

    // ===== PROBLEM → SOLUTION =====
    {
        id: 'ps-1',
        category: 'problem_solution',
        title: 'Problem Solving',
        prompt: 'How do I solve [common problem your product solves]?',
        description: 'Tests if LLMs recommend your product when users describe problems.',
        llmTip: 'Replace with a specific problem your product addresses.',
    },
    {
        id: 'ps-2',
        category: 'problem_solution',
        title: 'How-To Guide',
        prompt: 'What\'s the best way to [task your product helps with] for {{audience}}?',
        description: 'Checks if LLMs cite your brand in how-to responses.',
    },
    {
        id: 'ps-3',
        category: 'problem_solution',
        title: 'Tool Recommendation',
        prompt: 'I need a tool to help me with {{industry}}. What do you recommend?',
        description: 'Direct tool recommendation — high commercial intent.',
    },
    {
        id: 'ps-4',
        category: 'problem_solution',
        title: 'Beginner Advice',
        prompt: 'I\'m new to {{industry}}. What product/service should I start with?',
        description: 'Tests brand visibility for newcomer queries.',
    },
    {
        id: 'ps-5',
        category: 'problem_solution',
        title: 'Expert Recommendation',
        prompt: 'As an expert in {{industry}}, what product would you recommend for {{audience}}?',
        description: 'Tests recommendations when users ask for expert-level advice.',
    },
    {
        id: 'ps-6',
        category: 'problem_solution',
        title: 'Use Case Specific',
        prompt: 'What {{industry}} solution works best for small businesses with a limited budget?',
        description: 'Tests visibility for specific use-case queries.',
    },

    // ===== REVIEWS & REPUTATION =====
    {
        id: 'rr-1',
        category: 'reviews_reputation',
        title: 'Trust Check',
        prompt: 'Is {{brand}} trustworthy? What do people say about them?',
        description: 'Tests your brand\'s perceived trustworthiness in LLMs.',
    },
    {
        id: 'rr-2',
        category: 'reviews_reputation',
        title: 'Review Summary',
        prompt: 'What are the reviews of {{brand}} like? Is it worth buying?',
        description: 'Checks how LLMs summarize your brand reviews.',
    },
    {
        id: 'rr-3',
        category: 'reviews_reputation',
        title: 'Customer Satisfaction',
        prompt: 'Are {{brand}} customers generally happy? What complaints do they have?',
        description: 'Tests if negative sentiment is associated with your brand.',
    },
    {
        id: 'rr-4',
        category: 'reviews_reputation',
        title: 'Quality Assessment',
        prompt: 'Is {{brand}} a premium or budget option in {{industry}}?',
        description: 'Checks how LLMs position your brand\'s quality tier.',
    },
    {
        id: 'rr-5',
        category: 'reviews_reputation',
        title: 'Reddit Sentiment',
        prompt: 'What does Reddit say about {{brand}}? Is it recommended?',
        description: 'Tests LLM integration of Reddit discussions about your brand.',
        llmTip: 'Reddit content heavily influences LLM training data.',
    },

    // ===== CATEGORY LEADERS =====
    {
        id: 'cl-1',
        category: 'category_leaders',
        title: 'Best-of List',
        prompt: 'What are the best {{industry}} products in 2026?',
        description: 'The most common "best of" query — checks if you\'re listed.',
    },
    {
        id: 'cl-2',
        category: 'category_leaders',
        title: 'Top 10 Ranking',
        prompt: 'Give me a top 10 list of {{industry}} solutions ranked by quality.',
        description: 'Tests if you appear in ranked lists and at what position.',
    },
    {
        id: 'cl-3',
        category: 'category_leaders',
        title: 'Award Winners',
        prompt: 'Which {{industry}} products have won awards or recognition recently?',
        description: 'Tests if LLMs associate your brand with industry recognition.',
    },
    {
        id: 'cl-4',
        category: 'category_leaders',
        title: 'Market Leaders',
        prompt: 'Who are the market leaders in {{industry}} and what makes them stand out?',
        description: 'Checks if your brand is considered a market leader.',
    },
    {
        id: 'cl-5',
        category: 'category_leaders',
        title: 'Trending Products',
        prompt: 'What {{industry}} products are trending right now in 2026?',
        description: 'Tests if LLMs see your brand as current and trending.',
    },
    {
        id: 'cl-6',
        category: 'category_leaders',
        title: 'Most Popular',
        prompt: 'What is the most popular {{industry}} brand and why?',
        description: 'Checks if LLMs consider your brand popular.',
    },
];

/**
 * Fill template variables with actual brand/industry values
 */
export function fillTemplate(
    template: string,
    variables: {
        brand?: string;
        industry?: string;
        product?: string;
        audience?: string;
    }
): string {
    let result = template;
    result = result.replace(/\{\{brand\}\}/g, variables.brand || '[your brand]');
    result = result.replace(/\{\{industry\}\}/g, variables.industry || '[your industry]');
    result = result.replace(/\{\{product\}\}/g, variables.product || '[your product]');
    result = result.replace(/\{\{audience\}\}/g, variables.audience || '[your audience]');
    return result;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: PromptCategory): PromptTemplate[] {
    return PROMPT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): PromptCategory[] {
    return Object.keys(CATEGORY_META) as PromptCategory[];
}
