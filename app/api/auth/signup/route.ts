import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
    try {
        const { email, password, fullName } = await request.json();

        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';

        try {
            await limiter.check(5, ip); // Max 5 signups per IP per hour
        } catch {
            return NextResponse.json(
                { error: 'Too many signup attempts. Please try again later.' },
                { status: 429 }
            );
        }

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Create user with admin client (auto-confirms email)
        const { data, error } = await supabase.auth.admin.createUser({
            email: email.trim(),
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName?.trim() || '',
            },
        });

        if (data?.user) {
            try {
                const { sendWelcomeEmail } = await import('@/lib/email');
                await sendWelcomeEmail(data.user.email!, fullName?.trim());
            } catch (emailErr) {
                console.error('Failed to send welcome email:', emailErr);
                // Non-blocking error, we still want to return success for signup
            }
        }

        if (error) {
            console.error('Admin signup error:', error);

            if (error.message.includes('already been registered') ||
                error.message.includes('already exists')) {
                return NextResponse.json(
                    { error: 'An account with this email already exists. Please sign in instead.' },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            user: {
                id: data.user.id,
                email: data.user.email,
            },
            message: 'Account created successfully',
        });
    } catch (err) {
        console.error('Signup API error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
