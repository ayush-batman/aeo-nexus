import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { workspace_id, event_type, referrer, ai_source, path, metadata } = body;

        if (!workspace_id || !event_type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Initialize Admin Client for insertion (bypassing RLS)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Missing Supabase Service Key for Analytics');
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });

        const { error } = await adminClient
            .from('analytics_events')
            .insert({
                workspace_id,
                event_type,
                referrer,
                ai_source,
                path,
                metadata
            });

        if (error) {
            console.error('Analytics Insert Error:', error);
            return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
        }

        return NextResponse.json({ success: true }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
