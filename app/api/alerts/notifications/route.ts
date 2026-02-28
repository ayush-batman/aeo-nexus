import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';

// GET: Fetch unread notifications
export async function GET() {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error fetching notifications:', error);
            return NextResponse.json({ notifications: [], unreadCount: 0 });
        }

        const unreadCount = (data || []).filter(n => !n.read).length;

        return NextResponse.json({
            notifications: data || [],
            unreadCount,
        });
    } catch (err) {
        console.error('Notifications error:', err);
        return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
    }
}

// PATCH: Mark notifications as read
export async function PATCH(req: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ids, markAllRead } = await req.json();

        const supabase = await createClient();

        if (markAllRead) {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('workspace_id', workspaceId)
                .eq('read', false);
        } else if (Array.isArray(ids) && ids.length > 0) {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('workspace_id', workspaceId)
                .in('id', ids);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Mark read error:', err);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }
}
