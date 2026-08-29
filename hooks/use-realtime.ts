"use client";

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'llm_scans' | 'forum_threads' | 'content_analyses';
type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T extends Record<string, unknown>> {
    table: TableName;
    event?: ChangeEvent;
    filter?: string;
    onInsert?: (payload: T) => void;
    onUpdate?: (payload: T) => void;
    onDelete?: (payload: { old: T }) => void;
    onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export function useRealtime<T extends Record<string, unknown>>({
    table, event = '*', filter, onInsert, onUpdate, onDelete, onChange,
}: UseRealtimeOptions<T>): void {
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`realtime-${table}-${Date.now()}`)
            .on<T>('postgres_changes', {
                event: '*', schema: 'public', table, ...(filter ? { filter } : {}),
            }, (payload) => {
                if (event !== '*' && payload.eventType !== event) return;
                onChange?.(payload);
                if (payload.eventType === 'INSERT') onInsert?.(payload.new as T);
                else if (payload.eventType === 'UPDATE') onUpdate?.(payload.new as T);
                else if (payload.eventType === 'DELETE') onDelete?.({ old: payload.old as T });
            })
            .subscribe();

        return () => { void supabase.removeChannel(channel); };
    }, [table, event, filter, onInsert, onUpdate, onDelete, onChange]);
}

export function useLLMScansRealtime(workspaceId: string | null, callbacks: {
    onNewScan?: (scan: Record<string, unknown>) => void;
    onScanUpdate?: (scan: Record<string, unknown>) => void;
}): void {
    useRealtime({ table: 'llm_scans', filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined, onInsert: callbacks.onNewScan, onUpdate: callbacks.onScanUpdate });
}

export function useForumThreadsRealtime(workspaceId: string | null, callbacks: {
    onNewThread?: (thread: Record<string, unknown>) => void;
    onThreadUpdate?: (thread: Record<string, unknown>) => void;
    onThreadDelete?: (data: { old: Record<string, unknown> }) => void;
}): void {
    useRealtime({ table: 'forum_threads', filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined, onInsert: callbacks.onNewThread, onUpdate: callbacks.onThreadUpdate, onDelete: callbacks.onThreadDelete });
}
