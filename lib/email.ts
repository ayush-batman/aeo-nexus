import { Resend } from 'resend';
import WelcomeEmail from '@/components/emails/WelcomeEmail';
import SentimentDriftEmail from '@/components/emails/SentimentDriftEmail';
import type { DriftAlert } from '@/lib/analytics/sentiment-drift';
import * as React from 'react';

// Lazy init: constructing Resend without an API key throws, and Next's
// build-time page-data collection evaluates this module before env vars
// exist on fresh deploys. Never instantiate at module scope.
let _resend: Resend | null = null;
function getResend(): Resend | null {
    if (!process.env.RESEND_API_KEY) return null;
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
}

const FROM_EMAIL = 'Aelo <welcome@aeonexus.com>'; // Replace with your verified domain when going to production

export async function sendWelcomeEmail(to: string, name?: string) {
    const resend = getResend();
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Skipping welcome email to:', to);
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: 'Welcome to Aelo, your workspace is ready',
            react: WelcomeEmail({ firstName: name }),
        });

        if (error) {
            console.error('Error sending welcome email:', error);
            return { success: false, error };
        }

        console.log('Welcome email sent successfully:', data);
        return { success: true, data };
    } catch (err) {
        console.error('Failed to send welcome email:', err);
        return { success: false, error: err };
    }
}

export async function sendDriftAlertEmail(to: string, alert: DriftAlert) {
    const resend = getResend();
    if (!resend) {
        console.warn('RESEND_API_KEY not set. Skipping drift alert to:', to);
        return { success: false, skipped: true };
    }
    const subject = `${alert.workspace_name}: sentiment ${alert.direction === 'up' ? 'rose' : 'dropped'} ${Math.abs(alert.delta).toFixed(2)} on ${alert.platform}`;
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject,
            react: SentimentDriftEmail({ alert }),
        });
        if (error) { console.error('Drift email error:', error); return { success: false, error }; }
        return { success: true, data };
    } catch (err) {
        console.error('Drift email exception:', err);
        return { success: false, error: err };
    }
}
