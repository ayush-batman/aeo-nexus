// Drafts contain only supplied facts. Missing facts are never replaced with
// invented prices, locations, authors, opening hours, or reviews.
export function schemaDraft(input: { schemaType: string; brandName: string; description?: string }) {
  const types: Record<string, string> = { faq: 'FAQPage', faqpage: 'FAQPage', product: 'Product', howto: 'HowTo', article: 'Article', localbusiness: 'LocalBusiness' };
  const type = types[input.schemaType.toLowerCase().replace(/[-_ ]/g, '')];
  if (!type || !input.brandName.trim() || input.brandName.length > 200 || (input.description?.length ?? 0) > 10000) throw new Error('invalid_content');
  const missing: Record<string, string[]> = {
    FAQPage: ['Verified questions and answers that are visible on the page'],
    Product: ['Verified product URL, images and any real offer details'],
    HowTo: ['Verified, visible step-by-step instructions'],
    Article: ['Verified author, publication date, page URL and article text'],
    LocalBusiness: ['Verified address, contact details and opening hours'],
  };
  return { schema: { '@context': 'https://schema.org', '@type': type, name: input.brandName.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}) },
    status: 'draft' as const, missingFields: missing[type],
    warning: 'Incomplete draft using only your supplied facts. Add verified details and validate it before publishing; rich-result eligibility is not guaranteed.' };
}
