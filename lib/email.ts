import { Resend } from 'resend';
import WelcomeEmail from '@/components/emails/WelcomeEmail';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Lumina <welcome@aeonexus.com>'; // Replace with your verified domain when going to production

export async function sendWelcomeEmail(to: string, name?: string) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Skipping welcome email to:', to);
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: 'Welcome to Lumina 🚀',
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
