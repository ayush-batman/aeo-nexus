-- Alert preferences table
-- Stores per-workspace notification toggle settings
CREATE TABLE IF NOT EXISTS alert_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, alert_type)
);

-- Notifications table
-- Stores in-app notifications/alerts for users
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'visibility_drop', 'new_citation', 'hot_thread', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_preferences_workspace ON alert_preferences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(workspace_id, read) WHERE read = false;

-- RLS policies
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Alert preferences: workspace members can read/write their own
CREATE POLICY "Users can manage own alert preferences" ON alert_preferences
    FOR ALL USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w
            JOIN users u ON u.org_id = w.org_id
            WHERE u.id = auth.uid()
        )
    );

-- Notifications: workspace members can read/update their own
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w
            JOIN users u ON u.org_id = w.org_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w
            JOIN users u ON u.org_id = w.org_id
            WHERE u.id = auth.uid()
        )
    );

-- Service role can insert notifications (for cron/alert triggers)
CREATE POLICY "Service role can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);
