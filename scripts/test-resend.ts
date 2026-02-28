import { Resend } from 'resend';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is not set in .env.local. Skipping test email send.');
    process.exit(0);
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set in .env.local');
        process.exit(1);
    }
    console.log('Testing Resend...');
    try {
        const { data, error } = await resend.emails.send({
            from: 'AEO Nexus <welcome@aeonexus.com>',
            to: ['alex@example.com'], // Dummy testing
            subject: 'Testing Resend 🚀',
            html: '<p>It works!</p>',
        });

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Success:', data);
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

testEmail();
