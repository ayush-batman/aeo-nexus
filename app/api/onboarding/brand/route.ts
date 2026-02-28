import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';

export async function POST(request: NextRequest) {
    try {
        const { brandName, website, industry, description, targetAudience } = await request.json();

        if (!brandName) {
            return NextResponse.json(
                { error: 'brandName is required' },
                { status: 400 }
            );
        }

        const context = await getCurrentWorkspaceContext();

        if (!context) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        let adminClient: ReturnType<typeof createAdminClient> | null = null;
        try {
            adminClient = createAdminClient();
        } catch (error) {
            console.warn('[onboarding/brand] Admin client unavailable, falling back to RLS client:', error);
        }

        const db = adminClient ?? (await createClient());

        const { data: existing } = await db
            .from('products')
            .select('id')
            .eq('workspace_id', context.workspaceId)
            .limit(1)
            .maybeSingle();

        if (existing?.id) {
            const { error: updateError } = await db
                .from('products')
                .update({
                    name: brandName,
                    website: website || null,
                    description: description || null,
                    keywords: [brandName.toLowerCase()],
                })
                .eq('id', existing.id);

            if (updateError) {
                console.error('Error updating product:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update brand' },
                    { status: 500 }
                );
            }
        } else {
            const { error: insertError } = await db
                .from('products')
                .insert({
                    workspace_id: context.workspaceId,
                    name: brandName,
                    website: website || null,
                    description: description || null,
                    keywords: [brandName.toLowerCase()],
                });

            if (insertError) {
                console.error('Error creating product:', insertError);
                return NextResponse.json(
                    { error: 'Failed to save brand' },
                    { status: 500 }
                );
            }
        }

        if (industry || targetAudience) {
            const { error: wsError } = await db
                .from('workspaces')
                .update({
                    settings: {
                        industry: industry || null,
                        target_audience: targetAudience || null,
                    },
                })
                .eq('id', context.workspaceId);

            if (wsError) {
                console.error('Error updating workspace:', wsError);
                return NextResponse.json(
                    { error: 'Failed to update workspace' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Onboarding brand error:', error);
        return NextResponse.json(
            { error: 'Failed to save brand' },
            { status: 500 }
        );
    }
}
