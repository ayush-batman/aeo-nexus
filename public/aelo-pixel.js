(function () {
    const SCRIPT_ID = 'aeo-pixel';
    // Use absolute URL if possible, or relative to the script origin
    // In production, users will load this from https://aeo-nexus.com/aeo-pixel.js
    // So the endpoint should be absolute or relative to that domain.
    // For now, assuming script is hosted on same domain or we configure CORS.

    // Dynamic endpoint determination
    const scriptTag = document.getElementById(SCRIPT_ID);
    const scriptSrc = scriptTag ? scriptTag.src : '';
    const baseUrl = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
    const ENDPOINT = `${baseUrl}/api/analytics/track`;

    function getWorkspaceId() {
        return scriptTag ? scriptTag.getAttribute('data-workspace-id') : null;
    }

    function trackEvent(eventType, metadata = {}) {
        const workspaceId = getWorkspaceId();
        if (!workspaceId) {
            console.warn('AEO Pixel: Missing data-workspace-id attribute');
            return;
        }

        // Detect AI Referrer
        const referrer = document.referrer || '';
        let aiSource = null; // null means not AI

        const r = referrer.toLowerCase();
        if (r.includes('chatgpt.com') || r.includes('openai.com')) aiSource = 'chatgpt';
        else if (r.includes('gemini.google.com') || r.includes('bard.google.com')) aiSource = 'gemini';
        else if (r.includes('perplexity.ai')) aiSource = 'perplexity';
        else if (r.includes('claude.ai')) aiSource = 'claude';
        else if (r.includes('bing.com') && (r.includes('chat') || r.includes('search'))) aiSource = 'bing'; // check specific bing chat params if possible
        else if (r.includes('copilot.microsoft.com')) aiSource = 'copilot';

        // Only track if it's an AI source OR if we want to track all (let's track all for now and filter in dashboard)
        // Actually, to save DB space, maybe only track AI + direct? No, track all properly.
        // Normalized source
        const effectiveSource = aiSource || (referrer ? new URL(referrer).hostname : 'direct');

        const payload = {
            workspace_id: workspaceId,
            event_type: eventType,
            referrer: referrer,
            ai_source: aiSource || 'other', // explicitly mark known AI sources
            path: window.location.pathname + window.location.search,
            metadata
        };

        // Use beacon if available for reliability during navigation
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(ENDPOINT, blob);
        } else {
            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(err => console.error('AEO Pixel Error:', err));
        }
    }

    // Track Pageview on load
    if (document.readyState === 'complete') {
        trackEvent('pageview');
    } else {
        window.addEventListener('load', () => trackEvent('pageview'));
    }

    // Expose global function
    window.aeo = { track: trackEvent };
})();
