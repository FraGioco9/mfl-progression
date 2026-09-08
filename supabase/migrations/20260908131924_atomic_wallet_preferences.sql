create or replace function public.patch_wallet_preferences_atomic(
  p_wallet_address text,
  p_patch jsonb
)
returns setof public.wallet_preferences
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_row public.wallet_preferences%rowtype;
  v_incoming_table_state jsonb;
  v_table_state jsonb;
  v_recent_search_items jsonb;
  v_recent_evaluation_ids jsonb;
begin
  if nullif(btrim(p_wallet_address), '') is null then
    raise exception 'wallet address is required';
  end if;

  insert into public.wallet_preferences (wallet_address)
  values (p_wallet_address)
  on conflict (wallet_address) do nothing;

  select *
  into v_row
  from public.wallet_preferences
  where wallet_address = p_wallet_address
  for update;

  v_table_state := coalesce(v_row.table_state, '{}'::jsonb);

  if v_patch ? 'table_state' then
    v_incoming_table_state := case
      when jsonb_typeof(v_patch->'table_state') = 'object' then v_patch->'table_state'
      else '{}'::jsonb
    end;

    v_table_state := v_table_state || (v_incoming_table_state - 'recentSearchItems' - 'recentEvaluationPlayerIds');

    if v_incoming_table_state ? 'recentSearchItems' then
      select coalesce(jsonb_agg(ranked.value order by ranked.first_ord), '[]'::jsonb)
      into v_recent_search_items
      from (
        select candidates.value, min(candidates.ord) as first_ord
        from (
          select value, ordinality::bigint as ord
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(v_incoming_table_state->'recentSearchItems') = 'array'
                then v_incoming_table_state->'recentSearchItems'
              else '[]'::jsonb
            end
          ) with ordinality
          union all
          select value, 1000000 + ordinality::bigint as ord
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(v_table_state->'recentSearchItems') = 'array'
                then v_table_state->'recentSearchItems'
              else '[]'::jsonb
            end
          ) with ordinality
        ) candidates
        where btrim(candidates.value) <> ''
        group by candidates.value
        order by min(candidates.ord)
        limit 5
      ) ranked;
      v_table_state := jsonb_set(v_table_state, '{recentSearchItems}', v_recent_search_items, true);
    end if;

    if v_incoming_table_state ? 'recentEvaluationPlayerIds' then
      select coalesce(jsonb_agg(ranked.value order by ranked.first_ord), '[]'::jsonb)
      into v_recent_evaluation_ids
      from (
        select candidates.value, min(candidates.ord) as first_ord
        from (
          select value, ordinality::bigint as ord
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(v_incoming_table_state->'recentEvaluationPlayerIds') = 'array'
                then v_incoming_table_state->'recentEvaluationPlayerIds'
              else '[]'::jsonb
            end
          ) with ordinality
          union all
          select value, 1000000 + ordinality::bigint as ord
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(v_table_state->'recentEvaluationPlayerIds') = 'array'
                then v_table_state->'recentEvaluationPlayerIds'
              else '[]'::jsonb
            end
          ) with ordinality
        ) candidates
        where btrim(candidates.value) <> ''
        group by candidates.value
        order by min(candidates.ord)
        limit 5
      ) ranked;
      v_table_state := jsonb_set(v_table_state, '{recentEvaluationPlayerIds}', v_recent_evaluation_ids, true);
    end if;
  end if;

  update public.wallet_preferences
  set
    watchlists = case
      when v_patch ? 'watchlists' and jsonb_typeof(v_patch->'watchlists') = 'array' then v_patch->'watchlists'
      else watchlists
    end,
    player_notes = case
      when v_patch ? 'player_notes' and jsonb_typeof(v_patch->'player_notes') = 'object' then v_patch->'player_notes'
      else player_notes
    end,
    table_state = v_table_state,
    evaluation_settings = case
      when v_patch ? 'evaluation_settings' and jsonb_typeof(v_patch->'evaluation_settings') = 'object' then v_patch->'evaluation_settings'
      else evaluation_settings
    end,
    settings = case
      when v_patch ? 'settings' and jsonb_typeof(v_patch->'settings') = 'object' then v_patch->'settings'
      else settings
    end
  where wallet_address = p_wallet_address
  returning * into v_row;

  return next v_row;
  return;
end;
$$;

revoke all on function public.patch_wallet_preferences_atomic(text, jsonb) from public, anon, authenticated;
grant execute on function public.patch_wallet_preferences_atomic(text, jsonb) to service_role;
