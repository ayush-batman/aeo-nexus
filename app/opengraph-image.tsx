import { ImageResponse } from 'next/og';

// Dynamic OG image auto-served at /opengraph-image at build/request time.
// Next 15 auto-registers this file's export as the site-wide OG image, and
// the `metadata.openGraph.images` in app/layout.tsx references it.

export const size     = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt      = 'Aelo, AI visibility with honest data';

export default async function OG() {
    return new ImageResponse(
        (
            <div
                style={{
                    height:         '100%',
                    width:          '100%',
                    display:        'flex',
                    flexDirection:  'column',
                    justifyContent: 'space-between',
                    background:     '#000',
                    color:          '#fff',
                    padding:        80,
                    fontFamily:     'system-ui, sans-serif',
                }}
            >
                {/* The same wordmark used in the app and the browser icon. */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <div style={{ fontSize: 32, letterSpacing: '-0.08em', color: '#fff', fontWeight: 600 }}>
                        aelo
                    </div>
                    <div style={{ fontSize: 16, color: '#A8CBE0' }}>↗</div>
                </div>

                {/* Middle: pitch */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div
                        style={{
                            fontSize:       12,
                            letterSpacing:  '0.16em',
                            textTransform:  'uppercase',
                            color:          '#71717a',
                            fontFamily:     'monospace',
                        }}
                    >
                        AI Visibility · Honest Data
                    </div>
                    <div
                        style={{
                            fontSize:       64,
                            lineHeight:     1.05,
                            letterSpacing:  '-0.03em',
                            color:          '#fff',
                            fontWeight:     500,
                            maxWidth:       960,
                        }}
                    >
                        See how ChatGPT, Gemini, Claude and Perplexity actually answer.
                    </div>
                    <div
                        style={{
                            fontSize:       22,
                            lineHeight:     1.4,
                            color:          '#a1a1aa',
                            maxWidth:       880,
                        }}
                    >
                        Track your brand&apos;s AI visibility with the raw receipts behind every number. No black-box scores.
                    </div>
                </div>

                {/* Bottom: url */}
                <div
                    style={{
                        display:        'flex',
                        justifyContent: 'space-between',
                        alignItems:     'flex-end',
                    }}
                >
                    <div
                        style={{
                            fontSize:       18,
                            fontFamily:     'monospace',
                            color:          '#A8CBE0',
                            letterSpacing:  '0.02em',
                        }}
                    >
                        aelohq.com
                    </div>
                    <div
                        style={{
                            fontSize:       13,
                            color:          '#52525b',
                            fontFamily:     'monospace',
                        }}
                    >
                        Every number, one click from its receipt.
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
