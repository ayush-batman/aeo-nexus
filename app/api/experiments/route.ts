import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: List experiments for workspace
export async function GET() {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createClient();

        // Try to read from experiments table. If table doesn't exist, return empty.
        const { data, error } = await supabase
            .from('experiments')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) {
            // Table might not exist yet — return empty gracefully
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                return NextResponse.json({ experiments: [], needsMigration: true });
            }
            console.error('Experiments query error:', error);
            return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
        }

        return NextResponse.json({ experiments: data || [] });
    } catch (error) {
        console.error('Error fetching experiments:', error);
        return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
    }
}

// POST: Create a new experiment
export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, testQuestions, controlQuestions, hypothesis } = await request.json();

        if (!name || !testQuestions?.length || !controlQuestions?.length) {
            return NextResponse.json(
                { error: 'name, testQuestions, and controlQuestions are required' },
                { status: 400 }
            );
        }

        let db;
        try {
            db = createAdminClient();
        } catch {
            db = await createClient();
        }

        const { data, error } = await db
            .from('experiments')
            .insert({
                workspace_id: workspaceId,
                name,
                status: 'draft',
                hypothesis: hypothesis || null,
                test_questions: testQuestions,
                control_questions: controlQuestions,
                baseline_data: null,
                result_data: null,
            })
            .select()
            .single();

        if (error) {
            // Table might not exist
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                return NextResponse.json({
                    error: 'Experiments table not found. Please run the migration.',
                    needsMigration: true,
                }, { status: 400 });
            }
            console.error('Create experiment error:', error);
            return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
        }

        return NextResponse.json({ experiment: data });
    } catch (error) {
        console.error('Error creating experiment:', error);
        return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
    }
}

// DELETE: Delete an experiment
export async function DELETE(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        let db;
        try {
            db = createAdminClient();
        } catch {
            db = await createClient();
        }

        const { error } = await db
            .from('experiments')
            .delete()
            .eq('id', id)
            .eq('workspace_id', workspaceId);

        if (error) {
            console.error('Delete experiment error:', error);
            return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting experiment:', error);
        return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
    }
}
