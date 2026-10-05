import { NextResponse } from 'next/server';

export function convexRouteError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '';
  if (/payment_unconfigured/.test(message)) return NextResponse.json({ error: 'Checkout is temporarily unavailable. No charge was made.' }, { status: 503 });
  if (/nothing_to_cancel/.test(message)) return NextResponse.json({ error: 'There is no renewing subscription to cancel.' }, { status: 409 });
  if (/payment_cancel_failed/.test(message)) return NextResponse.json({ error: 'The payment provider did not confirm the cancellation. Nothing was changed; please retry.' }, { status: 503 });
  if (/rate_limit_exceeded|scan_quota_exceeded/.test(message)) return NextResponse.json({ error: 'Scan limit reached. Please try later or upgrade your plan.' }, { status: 429 });
  if (/request_id_conflict/.test(message)) return NextResponse.json({ error: 'This request identifier was already used for a different measurement.' }, { status: 409 });
  if (/Unauthenticated|verified_email_required|profile_not_provisioned|membership_not_found|invalid_ingest_token/.test(message)) {
    return NextResponse.json({ error: 'Please sign in with a verified account.' }, { status: 401 });
  }
  if (/forbidden_role|engine_not_entitled|thread_quota_exceeded/.test(message)) return NextResponse.json({ error: 'Your role or plan cannot make this change.' }, { status: 403 });
  if (/workspace_not_found|product_not_found|prompt_not_found|schedule_not_found|measurement_not_found|api_key_not_found|notification_not_found|thread_not_found|experiment_not_found|action_not_found/.test(message)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (/no_engines_available/.test(message)) return NextResponse.json({ error: 'No AI engine is configured for this measurement. Retrying will not help until one is enabled.' }, { status: 503 });
  if (/invalid_public_scan|invalid_product|invalid_prompt|invalid_website|invalid_workspace|invalid_schedule|invalid_platform|invalid_scan_limit|invalid_measurement|invalid_plan|invalid_signature|invalid_payment|invalid_preferences|invalid_notifications|invalid_profile|invalid_thread|invalid_discovery|invalid_experiment|invalid_action|invalid_content|invalid_event/.test(message)) return NextResponse.json({ error: 'Please check the supplied values.' }, { status: 400 });
  return NextResponse.json({ error: 'The request could not be completed. Please retry.' }, { status: 503 });
}
