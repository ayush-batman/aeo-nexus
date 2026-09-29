export function suggestedBuyerPrompts(industry: string, audience: string): string[] {
  const category = industry ? industry.replaceAll('_', ' ') : 'software';
  const buyer = audience.trim() || 'growing teams';
  return [
    `What are the best ${category} tools for ${buyer}?`,
    `Which ${category} platforms would you recommend for ${buyer}, and why?`,
    `What are the leading alternatives in ${category} for ${buyer}?`,
  ];
}

export function promptNamesBrand(prompt: string, brandName: string): boolean {
  const name = brandName.trim();
  return name.length > 0 && prompt.toLocaleLowerCase('en-US').includes(name.toLocaleLowerCase('en-US'));
}
