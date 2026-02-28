import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
    try {
        const supabase = createAdminClient();
        const email = 'adidas.test@example.com';
        const password = 'Password123!';

        // Check if user exists
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users.find(u => u.email === email);

        if (existingUser) {
            // Delete existing user to ensure clean slate
            await supabase.auth.admin.deleteUser(existingUser.id);
            console.log('Deleted existing user:', email);
        }

        // Create new user with confirmed email
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Adidas Tester' }
        });

        if (createError) throw createError;

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Setup user error:', error);
        return NextResponse.json(
            { error: 'Failed to setup test user', details: error },
            { status: 500 }
        );
    }
}
