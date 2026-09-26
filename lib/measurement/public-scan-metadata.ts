import type { Metadata } from 'next';

type PublicScanMetadataInput = {
  brand_name: string;
  platform: string;
  status: string;
  brand_mentioned: boolean | null;
  mention_position: number | null;
  error_message: string | null;
};

export function buildPublicScanMetadata(scan: PublicScanMetadataInput): Metadata {
  const engine = scan.platform === 'gemini' ? 'Gemini' : scan.platform;
  let title: string;
  let description: string;

  if (scan.status === 'failed' || scan.error_message) {
    title = `${scan.brand_name}, ${engine} scan failed`;
    description = `${engine} scan for ${scan.brand_name} failed. No usable answer or visibility result was recorded.`;
  } else if (scan.status !== 'complete') {
    title = `${scan.brand_name}, ${engine} scan in progress`;
    description = `${engine} is answering a question about ${scan.brand_name}. No answer or visibility result is available yet.`;
  } else if (scan.brand_mentioned) {
    title = `${scan.brand_name}, mentioned in one ${engine} answer`;
    const position = scan.mention_position && scan.mention_position > 0
      ? ` at position #${scan.mention_position}` : '';
    description = `In one saved ${engine} answer, ${scan.brand_name} was mentioned${position}. Read the answer and its provider citations; this is not a visibility score.`;
  } else if (scan.brand_mentioned === false) {
    title = `${scan.brand_name}, not mentioned in one ${engine} answer`;
    description = `${scan.brand_name} was not mentioned in this one answer from ${engine}. Read the saved answer; this is not a visibility score.`;
  } else {
    title = `${scan.brand_name}, one ${engine} answer saved`;
    description = `One ${engine} answer about ${scan.brand_name} was saved, but its mention status was not assessed. Read the answer; no visibility result is claimed.`;
  }

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  };
}
