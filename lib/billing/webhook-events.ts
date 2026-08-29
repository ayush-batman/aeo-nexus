import { createAdminClient } from '@/lib/supabase/admin';
import type { BillablePlan } from './plans';

export interface BillingEventInput {
  provider: 'stripe' | 'razorpay';
  eventId: string;
  eventType: string;
  orgId: string;
  plan: BillablePlan | 'free';
  subscriptionId: string | null;
  occurredAt?: string | null;
}

export async function applyBillingEvent(input: BillingEventInput): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_billing_event', {
    p_provider: input.provider,
    p_event_id: input.eventId,
    p_event_type: input.eventType,
    p_org_id: input.orgId,
    p_plan: input.plan,
    p_subscription_id: input.subscriptionId,
    p_occurred_at: input.occurredAt ?? null,
  });

  if (error) {
    throw new Error(`Could not apply billing event: ${error.message}`);
  }
  if (typeof data !== 'boolean') {
    throw new Error('Billing event function returned an invalid result');
  }

  return data;
}

