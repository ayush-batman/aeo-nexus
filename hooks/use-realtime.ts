"use client";

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

/**
 * Hook for subscribing to Supabase Realtime changes on a table
 */
export function useRealtime<T extends Record<string, unknown>>({
    table,
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
}: UseRealtimeOptions<T>) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        const supabase = createClient();

        // Build channel configuration
        const channelConfig: {
            event: ChangeEvent;
            schema: string;
            table: string;
            filter?: string;
        } = {
            event,
            schema: 'public',
            table,
        };

        if (filter) {
            channelConfig.filter = filter;
        }

        // Create channel subscription
        const channel = supabase
            .channel(`realtime-${table}-${Date.now()}`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on(
                'postgres_changes' as any,
                channelConfig as any,
                (payload: RealtimePostgresChangesPayload<T>) => {
                    // Call the general onChange handler
                    onChange?.(payload);

                    // Call specific event handlers
                    switch (payload.eventType) {
                        case 'INSERT':
                            onInsert?.(payload.new as T);
                            break;
                        case 'UPDATE':
                            onUpdate?.(payload.new as T);
                            break;
                        case 'DELETE':
                            onDelete?.({ old: payload.old as T });
                            break;
                    }
                }
            )
            .subscribe();

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [table, event, filter, onInsert, onUpdate, onDelete, onChange]);

    return channelRef.current;
}

/**
 * Hook for subscribing to LLM scans changes
 */
export function useLLMScansRealtime(
    workspaceId: string | null,
    callbacks: {
        onNewScan?: (scan: Record<string, unknown>) => void;
        onScanUpdate?: (scan: Record<string, unknown>) => void;
    }
) {
    return useRealtime({
        table: 'llm_scans',
        filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined,
        onInsert: callbacks.onNewScan,
        onUpdate: callbacks.onScanUpdate,
    });
}

/**
 * Hook for subscribing to forum threads changes
 */
export function useForumThreadsRealtime(
    workspaceId: string | null,
    callbacks: {
        onNewThread?: (thread: Record<string, unknown>) => void;
        onThreadUpdate?: (thread: Record<string, unknown>) => void;
        onThreadDelete?: (data: { old: Record<string, unknown> }) => void;
    }
) {
    return useRealtime({
        table: 'forum_threads',
        filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined,
        onInsert: callbacks.onNewThread,
        onUpdate: callbacks.onThreadUpdate,
        onDelete: callbacks.onThreadDelete,
    });
}
