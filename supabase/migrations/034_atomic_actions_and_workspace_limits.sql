-- 034: Keep Action audit rows and brand limits atomic under concurrency.

CREATE OR REPLACE FUNCTION public.create_action_with_event(
  p_workspace_id uuid,
  p_actor_id uuid,
  p_action jsonb,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action public.interventions%ROWTYPE;
  v_created boolean := false;
BEGIN
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'invalid_idempotency_key';
  END IF;

  INSERT INTO public.interventions (
    workspace_id, action_type, title, description, action_url, target_prompts,
    status, action_taken_at, baseline_snapshot, owner_id, hypothesis, source_url,
    priority, target_engines, insight_key
  ) VALUES (
    p_workspace_id,
    p_action->>'action_type',
    p_action->>'title',
    p_action->>'description',
    p_action->>'action_url',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_action->'target_prompts', '[]'::jsonb))),
    COALESCE(p_action->>'status', 'planned'),
    NULLIF(p_action->>'action_taken_at', '')::timestamptz,
    COALESCE(p_action->'baseline_snapshot', '{}'::jsonb),
    NULLIF(p_action->>'owner_id', '')::uuid,
    p_action->>'hypothesis',
    p_action->>'source_url',
    COALESCE(p_action->>'priority', 'medium'),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_action->'target_engines', '[]'::jsonb))),
    p_action->>'insight_key'
  )
  ON CONFLICT (workspace_id, insight_key) WHERE insight_key IS NOT NULL DO NOTHING
  RETURNING * INTO v_action;

  IF v_action.id IS NULL THEN
    SELECT * INTO v_action
      FROM public.interventions
      WHERE workspace_id = p_workspace_id
        AND insight_key = p_action->>'insight_key';
  ELSE
    v_created := true;
  END IF;

  IF v_action.id IS NULL THEN
    RAISE EXCEPTION 'action_create_failed';
  END IF;

  INSERT INTO public.action_events (
    action_id, workspace_id, actor_id, event_type, to_status, changes, idempotency_key
  ) VALUES (
    v_action.id,
    p_workspace_id,
    p_actor_id,
    'created',
    v_action.status,
    jsonb_build_object(
      'owner_id', v_action.owner_id,
      'priority', v_action.priority,
      'insight_key', v_action.insight_key
    ),
    p_idempotency_key
  )
  ON CONFLICT (action_id, idempotency_key) DO NOTHING;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_created THEN 'created' ELSE 'existing' END,
    'action', to_jsonb(v_action)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_action_with_event(
  p_workspace_id uuid,
  p_action_id uuid,
  p_actor_id uuid,
  p_changes jsonb,
  p_event_type text,
  p_from_status text,
  p_to_status text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action public.interventions%ROWTYPE;
BEGIN
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'invalid_idempotency_key';
  END IF;
  IF p_event_type NOT IN ('updated', 'status_changed', 'measured') THEN
    RAISE EXCEPTION 'invalid_action_event_type';
  END IF;

  SELECT * INTO v_action
    FROM public.interventions
    WHERE id = p_action_id AND workspace_id = p_workspace_id
    FOR UPDATE;

  IF v_action.id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.action_events
    WHERE action_id = p_action_id AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('status', 'duplicate', 'action', to_jsonb(v_action));
  END IF;

  UPDATE public.interventions SET
    title = CASE WHEN p_changes ? 'title' THEN p_changes->>'title' ELSE title END,
    hypothesis = CASE WHEN p_changes ? 'hypothesis' THEN p_changes->>'hypothesis' ELSE hypothesis END,
    description = CASE WHEN p_changes ? 'description' THEN p_changes->>'description' ELSE description END,
    source_url = CASE WHEN p_changes ? 'source_url' THEN p_changes->>'source_url' ELSE source_url END,
    action_url = CASE WHEN p_changes ? 'action_url' THEN p_changes->>'action_url' ELSE action_url END,
    owner_id = CASE WHEN p_changes ? 'owner_id' THEN NULLIF(p_changes->>'owner_id', '')::uuid ELSE owner_id END,
    priority = CASE WHEN p_changes ? 'priority' THEN p_changes->>'priority' ELSE priority END,
    status = CASE WHEN p_changes ? 'status' THEN p_changes->>'status' ELSE status END,
    target_prompts = CASE WHEN p_changes ? 'target_prompts'
      THEN ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_changes->'target_prompts', '[]'::jsonb)))
      ELSE target_prompts END,
    target_engines = CASE WHEN p_changes ? 'target_engines'
      THEN ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_changes->'target_engines', '[]'::jsonb)))
      ELSE target_engines END,
    baseline_snapshot = CASE WHEN p_changes ? 'baseline_snapshot' THEN COALESCE(p_changes->'baseline_snapshot', '{}'::jsonb) ELSE baseline_snapshot END,
    impact_snapshot = CASE WHEN p_changes ? 'impact_snapshot' THEN COALESCE(p_changes->'impact_snapshot', '{}'::jsonb) ELSE impact_snapshot END,
    impact_summary = CASE WHEN p_changes ? 'impact_summary' THEN COALESCE(p_changes->'impact_summary', '{}'::jsonb) ELSE impact_summary END,
    action_taken_at = CASE WHEN p_changes ? 'action_taken_at' THEN NULLIF(p_changes->>'action_taken_at', '')::timestamptz ELSE action_taken_at END
  WHERE id = p_action_id AND workspace_id = p_workspace_id
  RETURNING * INTO v_action;

  INSERT INTO public.action_events (
    action_id, workspace_id, actor_id, event_type, from_status, to_status, changes, idempotency_key
  ) VALUES (
    p_action_id, p_workspace_id, p_actor_id, p_event_type,
    p_from_status, p_to_status, p_changes, p_idempotency_key
  );

  RETURN jsonb_build_object('status', 'updated', 'action', to_jsonb(v_action));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace_with_plan_limit(
  p_org_id uuid,
  p_name text,
  p_settings jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan text;
  v_limit integer;
  v_count integer;
  v_workspace public.workspaces%ROWTYPE;
BEGIN
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid_workspace_name';
  END IF;
  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'invalid_workspace_settings';
  END IF;

  SELECT plan INTO v_plan
    FROM public.organizations
    WHERE id = p_org_id
    FOR UPDATE;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('status', 'organization_not_found');
  END IF;

  v_limit := CASE WHEN v_plan = 'free' THEN 1 ELSE NULL END;
  IF v_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.workspaces WHERE org_id = p_org_id;
    IF v_count >= v_limit THEN
      RETURN jsonb_build_object('status', 'denied', 'limit', v_limit);
    END IF;
  END IF;

  INSERT INTO public.workspaces (org_id, name, settings)
  VALUES (p_org_id, btrim(p_name), p_settings)
  RETURNING * INTO v_workspace;

  RETURN jsonb_build_object('status', 'created', 'workspace', to_jsonb(v_workspace));
END;
$$;

REVOKE ALL ON FUNCTION public.create_action_with_event(uuid, uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_action_with_event(uuid, uuid, uuid, jsonb, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_workspace_with_plan_limit(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_action_with_event(uuid, uuid, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_action_with_event(uuid, uuid, uuid, jsonb, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_plan_limit(uuid, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.create_action_with_event(uuid, uuid, jsonb, text) IS
  'Service-role-only atomic Action creation plus immutable audit event.';
COMMENT ON FUNCTION public.update_action_with_event(uuid, uuid, uuid, jsonb, text, text, text, text) IS
  'Service-role-only idempotent Action mutation plus immutable audit event under an Action row lock.';
COMMENT ON FUNCTION public.create_workspace_with_plan_limit(uuid, text, jsonb) IS
  'Service-role-only workspace creation with plan limit enforced under an organization row lock.';

-- Rollback: switch routes back before dropping these functions. Existing rows
-- are ordinary interventions, action_events, and workspaces and need no rewrite.
