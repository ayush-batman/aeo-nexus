/** Keep the reported window and the queried day count as one choice. */
export function resolveApiWindow<const T extends string>(
  requested: string | null,
  choices: readonly (readonly [T, number])[],
  fallback: T,
): { window: T; days: number } {
  const selected = choices.find(([window]) => window === requested)
    ?? choices.find(([window]) => window === fallback);
  if (!selected) throw new Error('invalid_api_window_configuration');
  return { window: selected[0], days: selected[1] };
}
