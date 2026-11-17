-- SỔ GHI: chạy toàn bộ file trong Supabase SQL Editor với quyền postgres.
-- Không sửa Auth hoặc bảng của dự án khác. Cài lại cùng phiên bản không xóa dữ liệu.
begin;
do $soghi_preflight$
declare existing_version integer;
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise exception 'Sổ Ghi cần extension pgcrypto. Bật pgcrypto trong Database > Extensions rồi chạy lại.';
  end if;
  if to_regclass('public.soghi_schema') is null and (exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like 'soghi\_%' escape '\' and c.relkind in ('r','v','m','S')
  ) or exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'soghi\_%' escape '\')) then raise exception 'Đã có đối tượng soghi_ từ cấu trúc khác. Cần kiểm tra trước khi cài; chưa có thay đổi nào được áp dụng.'; end if;
  if to_regclass('public.soghi_schema') is not null then
    execute 'select version from public.soghi_schema where id=1' into existing_version;
    if existing_version is distinct from 1 then raise exception 'Phiên bản schema Sổ Ghi không tương thích.'; end if;
  end if;
end
$soghi_preflight$;
create table if not exists public.soghi_schema (
  id integer primary key check(id=1), version integer not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.soghi_schema(id,version) values (1,1) on conflict(id) do nothing;
create table if not exists public.soghi_accounts (
  id uuid primary key default gen_random_uuid(), username text not null, username_key text not null unique,
  display_name text not null, pin_hash text not null, revision bigint not null default 0,
  failed_attempts integer not null default 0, locked_until timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.soghi_sessions (
  token_hash text primary key, account_id uuid not null references public.soghi_accounts(id) on delete cascade,
  expires_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists soghi_sessions_account_idx on public.soghi_sessions(account_id,expires_at);
create table if not exists public.soghi_harvesters (
  account_id uuid not null references public.soghi_accounts(id) on delete cascade, id text not null,
  name text not null, data jsonb not null, created_at timestamptz not null, updated_at timestamptz not null,
  primary key(account_id,id)
);
create table if not exists public.soghi_entries (
  account_id uuid not null, id text not null, harvester_id text not null, entry_date date not null,
  kg numeric(12,2) not null check(kg>=0 and kg<=999999.99), data jsonb not null,
  created_at timestamptz not null, updated_at timestamptz not null,
  primary key(account_id,id), foreign key(account_id,harvester_id) references public.soghi_harvesters(account_id,id)
);
create index if not exists soghi_entries_person_date_idx on public.soghi_entries(account_id,harvester_id,entry_date);
create table if not exists public.soghi_rates (
  account_id uuid not null references public.soghi_accounts(id), id text not null, harvester_id text,
  effective_date date not null, amount bigint not null check(amount between 0 and 100000000), data jsonb not null,
  created_at timestamptz not null, updated_at timestamptz not null,
  primary key(account_id,id), foreign key(account_id,harvester_id) references public.soghi_harvesters(account_id,id)
);
create unique index if not exists soghi_rates_common_date_idx on public.soghi_rates(account_id,effective_date) where harvester_id is null;
create unique index if not exists soghi_rates_person_date_idx on public.soghi_rates(account_id,harvester_id,effective_date) where harvester_id is not null;
create table if not exists public.soghi_advances (
  account_id uuid not null, id text not null, harvester_id text not null, advance_date date not null,
  amount bigint not null check(amount between 1 and 1000000000000), note text not null default '', data jsonb not null,
  created_at timestamptz not null, updated_at timestamptz not null,
  primary key(account_id,id), foreign key(account_id,harvester_id) references public.soghi_harvesters(account_id,id)
);
create index if not exists soghi_advances_person_date_idx on public.soghi_advances(account_id,harvester_id,advance_date);
create table if not exists public.soghi_settlements (
  account_id uuid not null, id text not null, harvester_id text not null,
  total_kg100 bigint not null check(total_kg100>=0), gross bigint not null check(gross>=0),
  advance_applied bigint not null check(advance_applied>=0), payable bigint not null check(payable>=0),
  data jsonb not null, created_at timestamptz not null, updated_at timestamptz not null,
  primary key(account_id,id), foreign key(account_id,harvester_id) references public.soghi_harvesters(account_id,id)
);
create index if not exists soghi_settlements_person_time_idx on public.soghi_settlements(account_id,harvester_id,created_at);
create table if not exists public.soghi_settlement_entries (
  account_id uuid not null, settlement_id text not null, entry_id text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(account_id,entry_id),
  foreign key(account_id,settlement_id) references public.soghi_settlements(account_id,id),
  foreign key(account_id,entry_id) references public.soghi_entries(account_id,id)
);
create table if not exists public.soghi_settlement_advances (
  account_id uuid not null, settlement_id text not null, advance_id text not null, amount bigint not null check(amount>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(account_id,settlement_id,advance_id),
  foreign key(account_id,settlement_id) references public.soghi_settlements(account_id,id),
  foreign key(account_id,advance_id) references public.soghi_advances(account_id,id)
);
create index if not exists soghi_settlement_advances_advance_idx on public.soghi_settlement_advances(account_id,advance_id);
create table if not exists public.soghi_settings (
  account_id uuid primary key references public.soghi_accounts(id), theme text not null default 'green' check(theme in ('green','blue')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.soghi_requests (
  account_id uuid not null references public.soghi_accounts(id), request_id uuid not null,
  request_hash text not null, revision bigint not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(account_id,request_id)
);
-- Dùng đúng namespace pgcrypto hiện có, không di chuyển extension dùng chung.
do $soghi_crypto$
declare ns text;
begin
  select n.nspname into ns from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';
  execute format('create or replace function public.soghi_hash(p_text text) returns text language sql immutable set search_path=pg_catalog as $f$ select encode(%I.digest(p_text,''sha256''),''hex'') $f$',ns);
  execute format('create or replace function public.soghi_pin_create(p_pin text) returns text language sql volatile set search_path=pg_catalog as $f$ select %I.crypt(p_pin,%I.gen_salt(''bf'',10)) $f$',ns,ns);
  execute format('create or replace function public.soghi_pin_matches(p_pin text,p_hash text) returns boolean language sql immutable set search_path=pg_catalog as $f$ select %I.crypt(p_pin,p_hash)=p_hash $f$',ns);
  execute format('create or replace function public.soghi_random_token() returns text language sql volatile set search_path=pg_catalog as $f$ select encode(%I.gen_random_bytes(32),''hex'') $f$',ns);
end
$soghi_crypto$;
create or replace function public.soghi_username_key(p_value text) returns text language sql immutable set search_path=pg_catalog as $$
  select lower(translate(regexp_replace(regexp_replace(normalize(btrim(p_value),NFD),U&'[\0300-\036f]','','g'),'\s+',' ','g'),'đĐ','dD'));
$$;
create or replace function public.soghi_account(p_token text) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare result uuid;
begin
  if p_token is null or length(p_token)<>64 then raise exception 'SESSION_EXPIRED: Hãy đăng nhập lại để đồng bộ.'; end if;
  select account_id into result from public.soghi_sessions where token_hash=public.soghi_hash(p_token) and expires_at>now();
  if result is null then raise exception 'SESSION_EXPIRED: Phiên đồng bộ hết hạn, hãy đăng nhập lại.'; end if;
  return result;
end $$;
create or replace function public.soghi_new_session(p_account uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare token text:=public.soghi_random_token(); expires timestamptz:=now()+interval '30 days'; a public.soghi_accounts;
begin
  select * into a from public.soghi_accounts where id=p_account;
  delete from public.soghi_sessions where account_id=p_account and expires_at<now();
  insert into public.soghi_sessions(token_hash,account_id,expires_at) values(public.soghi_hash(token),p_account,expires);
  return jsonb_build_object('ok',true,'account',jsonb_build_object('id',a.id,'username',a.username,'usernameKey',a.username_key,'displayName',a.display_name),'token',token,'expiresAt',expires);
end $$;
create or replace function public.soghi_register(p_username text,p_display_name text,p_pin text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare account_id uuid; username_key text:=public.soghi_username_key(p_username);
begin
  if p_username is null or length(p_username)>80 or length(username_key)<1 or p_display_name is null or length(btrim(p_display_name)) not between 1 and 80 or p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok',false,'error','INVALID_INPUT','message','Tên, username hoặc PIN 6 số không hợp lệ.'); end if;
  insert into public.soghi_accounts(username,username_key,display_name,pin_hash)
    values(btrim(p_username),username_key,btrim(p_display_name),public.soghi_pin_create(p_pin)) returning id into account_id;
  insert into public.soghi_settings(account_id) values(account_id);
  return public.soghi_new_session(account_id);
exception when unique_violation then return jsonb_build_object('ok',false,'error','USERNAME_EXISTS','message','Username đã được sử dụng trên Supabase.');
end $$;
create or replace function public.soghi_login(p_username text,p_pin text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare a public.soghi_accounts;
begin
  select * into a from public.soghi_accounts where username_key=public.soghi_username_key(p_username) for update;
  if a.id is null then return jsonb_build_object('ok',false,'error','INVALID_LOGIN','message','Username hoặc PIN không đúng.'); end if;
  if a.locked_until>now() then return jsonb_build_object('ok',false,'error','LOGIN_LOCKED','message','Đã nhập sai PIN nhiều lần. Thử lại sau 15 phút.'); end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' or not public.soghi_pin_matches(p_pin,a.pin_hash) then
    update public.soghi_accounts set failed_attempts=case when locked_until<=now() then 1 else failed_attempts+1 end,
      locked_until=case when (case when locked_until<=now() then 1 else failed_attempts+1 end)>=5 then now()+interval '15 minutes' else null end where id=a.id;
    return jsonb_build_object('ok',false,'error','INVALID_LOGIN','message','Username hoặc PIN không đúng.');
  end if;
  update public.soghi_accounts set failed_attempts=0,locked_until=null where id=a.id;
  return public.soghi_new_session(a.id);
end $$;
create or replace function public.soghi_logout(p_token text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
begin delete from public.soghi_sessions where token_hash=public.soghi_hash(p_token); return jsonb_build_object('ok',true); end $$;
create or replace function public.soghi_head(p_token text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare aid uuid:=public.soghi_account(p_token);
begin return (select jsonb_build_object('ok',true,'revision',revision) from public.soghi_accounts where id=aid); end $$;
create or replace function public.soghi_snapshot_internal(p_account uuid) returns jsonb language sql security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('ok',true,'revision',a.revision,'data',jsonb_build_object(
 'harvesters',(select coalesce(jsonb_agg(data order by id),'[]') from public.soghi_harvesters where account_id=a.id),
 'entries',(select coalesce(jsonb_agg(data order by id),'[]') from public.soghi_entries where account_id=a.id),
 'rates',(select coalesce(jsonb_agg(data order by id),'[]') from public.soghi_rates where account_id=a.id),
 'advances',(select coalesce(jsonb_agg(data order by id),'[]') from public.soghi_advances where account_id=a.id),
 'settlements',(select coalesce(jsonb_agg(data order by id),'[]') from public.soghi_settlements where account_id=a.id),
 'settings',jsonb_build_object('theme',coalesce((select theme from public.soghi_settings where account_id=a.id),'green'))))
 from public.soghi_accounts a where a.id=p_account;
$$;
create or replace function public.soghi_pull(p_token text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare aid uuid:=public.soghi_account(p_token);
begin
  -- Một câu SQL trả toàn bộ dữ liệu và revision trong cùng một snapshot.
  return public.soghi_snapshot_internal(aid);
end $$;
create or replace function public.soghi_assert(p_ok boolean,p_message text) returns void language plpgsql set search_path=pg_catalog as $$
begin if p_ok is not true then raise exception '%',p_message; end if; end $$;
create or replace function public.soghi_validate_data(p_data jsonb,p_account uuid,p_replace boolean,p_import boolean) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare k text; r jsonb; s jsonb; d jsonb; e jsonb; a jsonb; original jsonb;
  eid text; ids text[]; all_ids text[]:='{}'; day_ids text[]; day_dates text[];
  kg numeric; day_kg numeric; total_kg numeric; gross numeric; applied numeric; used numeric;
  allocations jsonb:='{}'; advance_ids text[]; people_map jsonb; entries_map jsonb; advances_map jsonb; settlements_map jsonb;
begin
  perform public.soghi_assert(jsonb_typeof(p_data)='object' and octet_length(p_data::text)<=25000000,'Dữ liệu đồng bộ không hợp lệ hoặc quá lớn (25 MB).');
  foreach k in array array['harvesters','entries','rates','advances','settlements'] loop
    perform public.soghi_assert(jsonb_typeof(p_data->k)='array' and jsonb_array_length(p_data->k)<=100000,'Thiếu hoặc quá nhiều bản ghi: '||k);
    perform public.soghi_assert(not exists(select 1 from jsonb_array_elements(p_data->k) x group by x->>'id' having count(*)>1),'ID trùng trong '||k);
    for r in select value from jsonb_array_elements(p_data->k) loop
      perform public.soghi_assert(jsonb_typeof(r)='object' and jsonb_typeof(r->'id')='string' and length(r->>'id') between 1 and 150,'ID thiếu hoặc trùng trong '||k);
      perform public.soghi_assert(jsonb_typeof(r->'createdAt')='string' and jsonb_typeof(r->'updatedAt')='string' and isfinite((r->>'createdAt')::timestamptz) and isfinite((r->>'updatedAt')::timestamptz),'Thời gian bản ghi không hợp lệ.');
    end loop;
  end loop;
  perform public.soghi_assert(p_data#>>'{settings,theme}' in ('green','blue'),'Màu giao diện không hợp lệ.');
  select coalesce(jsonb_object_agg(x->>'id',x),'{}') into people_map from jsonb_array_elements(p_data->'harvesters') x;
  select coalesce(jsonb_object_agg(x->>'id',x),'{}') into entries_map from jsonb_array_elements(p_data->'entries') x;
  select coalesce(jsonb_object_agg(x->>'id',x),'{}') into advances_map from jsonb_array_elements(p_data->'advances') x;
  select coalesce(jsonb_object_agg(x->>'id',x),'{}') into settlements_map from jsonb_array_elements(p_data->'settlements') x;
  perform public.soghi_assert(not exists(select 1 from jsonb_array_elements(p_data->'settlements') as snap_doc(doc) cross join lateral jsonb_array_elements_text(snap_doc.doc->'entryIds') as claimed(entry_id) group by claimed.entry_id having count(*)>1),'Số kg bị kết sổ trùng.');
  for r in select value from jsonb_array_elements(p_data->'harvesters') loop
    perform public.soghi_assert(jsonb_typeof(r->'name')='string' and length(btrim(r->>'name')) between 1 and 80,'Tên người hái không hợp lệ.');
  end loop;
  perform public.soghi_assert(not exists(select 1 from jsonb_array_elements(p_data->'harvesters') x group by public.soghi_username_key(x->>'name') having count(*)>1),'Tên người hái bị trùng.');
  foreach k in array array['entries','rates','advances','settlements'] loop
    for r in select value from jsonb_array_elements(p_data->k) loop
      perform public.soghi_assert((k='rates' and r->'harvesterId'='null'::jsonb) or people_map ? (r->>'harvesterId'),'Bản ghi không có người hái tương ứng.');
      if k in ('entries','advances') then
        perform public.soghi_assert((r->>'date') ~ '^\d{4}-\d{2}-\d{2}$' and (r->>'date')::date::text=r->>'date','Ngày không hợp lệ.');
      end if;
      if k='entries' then
        kg:=(r->>'kg')::numeric;
        perform public.soghi_assert(jsonb_typeof(r->'kg')='number' and kg between 0 and 999999.99 and kg*100=trunc(kg*100),'Số kg không hợp lệ (tối đa 2 số lẻ).');
      elsif k='rates' then
        perform public.soghi_assert((r->>'effectiveDate') ~ '^\d{4}-\d{2}-\d{2}$' and (r->>'effectiveDate')::date::text=r->>'effectiveDate' and jsonb_typeof(r->'amount')='number' and (r->>'amount')::numeric between 0 and 100000000 and (r->>'amount')::numeric=trunc((r->>'amount')::numeric),'Đơn giá không hợp lệ.');
      elsif k='advances' then
        perform public.soghi_assert(jsonb_typeof(r->'amount')='number' and (r->>'amount')::numeric between 1 and 1000000000000 and (r->>'amount')::numeric=trunc((r->>'amount')::numeric) and jsonb_typeof(r->'note')='string' and length(r->>'note')<=500,'Khoản ứng không hợp lệ.');
      end if;
    end loop;
  end loop;
  perform public.soghi_assert(not exists(select 1 from jsonb_array_elements(p_data->'rates') x group by x->>'harvesterId',x->>'effectiveDate' having count(*)>1),'Đơn giá bị trùng ngày/đối tượng.');
  for s in select value from jsonb_array_elements(p_data->'settlements') loop
    perform public.soghi_assert(jsonb_typeof(s->'personName')='string' and length(btrim(s->>'personName')) between 1 and 80 and s->>'mode' in ('range','all'),'Thông tin kết sổ không hợp lệ.');
    if s->>'mode'='range' then
      perform public.soghi_assert((s->>'from')::date::text=s->>'from' and (s->>'to')::date::text=s->>'to' and s->>'from'<=s->>'to','Khoảng kết sổ không hợp lệ.');
    else perform public.soghi_assert(s->>'from'='' and s->>'to'='','Phạm vi kết sổ toàn bộ không hợp lệ.'); end if;
    perform public.soghi_assert(jsonb_typeof(s->'entryIds')='array' and jsonb_array_length(s->'entryIds')>0 and jsonb_typeof(s->'days')='array' and jsonb_typeof(s->'advanceAllocations')='array','Kết sổ thiếu chi tiết.');
    day_ids:='{}'; day_dates:='{}'; total_kg:=0; gross:=0; applied:=0; advance_ids:='{}';
    for d in select value from jsonb_array_elements(s->'days') loop
      perform public.soghi_assert((d->>'date')::date::text=d->>'date' and not (d->>'date'=any(day_dates)) and jsonb_typeof(d->'entryIds')='array' and jsonb_array_length(d->'entryIds')>0 and jsonb_typeof(d->'rateId')='string','Chi tiết ngày kết sổ không hợp lệ.');
      perform public.soghi_assert(s->>'mode'='all' or (d->>'date'>=s->>'from' and d->>'date'<=s->>'to'),'Ngày sản lượng ngoài khoảng kết sổ.');
      perform public.soghi_assert(jsonb_typeof(d->'rate')='number' and (d->>'rate')::numeric between 0 and 100000000 and (d->>'rate')::numeric=trunc((d->>'rate')::numeric),'Đơn giá kết sổ không hợp lệ.');
      day_dates:=array_append(day_dates,d->>'date'); day_kg:=0;
      for eid in select jsonb_array_elements_text(d->'entryIds') loop
        e:=entries_map->eid;
        perform public.soghi_assert(e is not null and e->>'harvesterId'=s->>'harvesterId' and e->>'date'=d->>'date','Số kg bị thiếu hoặc kết sổ trùng.');
        day_ids:=array_append(day_ids,eid); day_kg:=day_kg+(e->>'kg')::numeric*100;
      end loop;
      perform public.soghi_assert(day_kg*(d->>'rate')::numeric<=9007199254740991 and (d->>'kg100')::numeric=day_kg and (d->>'amount')::numeric=round(day_kg*(d->>'rate')::numeric/100),'Tiền công từng ngày không khớp.');
      total_kg:=total_kg+day_kg; gross:=gross+(d->>'amount')::numeric;
    end loop;
    select array_agg(value order by value) into ids from jsonb_array_elements_text(s->'entryIds');
    perform public.soghi_assert(ids=(select array_agg(v order by v) from unnest(day_ids) v),'Danh sách kg kết sổ không khớp.');
    for a in select value from jsonb_array_elements(s->'advanceAllocations') loop
      original:=advances_map->(a->>'advanceId');
      used:=(a->>'amount')::numeric;
      perform public.soghi_assert(original is not null and original->>'harvesterId'=s->>'harvesterId' and original->>'date'=a->>'date' and (s->>'mode'='all' or a->>'date'<=s->>'to') and jsonb_typeof(a->'amount')='number' and used>0 and used=trunc(used) and not (a->>'advanceId'=any(advance_ids)) and jsonb_typeof(a->'note')='string','Khoản ứng khấu trừ không hợp lệ.');
      advance_ids:=array_append(advance_ids,a->>'advanceId');
      used:=coalesce((allocations->>(a->>'advanceId'))::numeric,0)+used;
      perform public.soghi_assert(used<=(original->>'amount')::numeric,'Tiền ứng bị trừ vượt số gốc.');
      allocations:=jsonb_set(allocations,array[a->>'advanceId'],to_jsonb(used),true);
      applied:=applied+(a->>'amount')::numeric;
    end loop;
    foreach k in array array['totalKg100','gross','availableAdvance','advanceApplied','payable','carry'] loop
      perform public.soghi_assert(jsonb_typeof(s->k)='number' and (s->>k)::numeric between 0 and 9007199254740991 and (s->>k)::numeric=trunc((s->>k)::numeric),'Tổng kết sổ không hợp lệ.');
    end loop;
    perform public.soghi_assert((s->>'totalKg100')::numeric=total_kg and (s->>'gross')::numeric=gross and (s->>'advanceApplied')::numeric=applied and applied=least(gross,(s->>'availableAdvance')::numeric) and (s->>'payable')::numeric=gross-applied and (s->>'carry')::numeric=(s->>'availableAdvance')::numeric-applied,'Tổng tiền kết sổ không khớp.');
  end loop;
  if not p_replace then
    perform public.soghi_assert(not exists(select 1 from public.soghi_settlements old where old.account_id=p_account and (settlements_map->old.id) is distinct from old.data),'Lịch sử kết sổ đã chốt không thể sửa hoặc xóa.');
    perform public.soghi_assert(not exists(select 1 from public.soghi_entries old join public.soghi_settlement_entries se on se.account_id=old.account_id and se.entry_id=old.id where old.account_id=p_account and (entries_map->old.id) is distinct from old.data),'Số kg đã kết sổ không thể sửa hoặc xóa.');
    perform public.soghi_assert(not exists(select 1 from public.soghi_advances old where old.account_id=p_account and exists(select 1 from public.soghi_settlement_advances sa where sa.account_id=p_account and sa.advance_id=old.id) and (advances_map->old.id) is distinct from old.data),'Khoản ứng đã khấu trừ không thể sửa hoặc xóa.');
    if not p_import then
      perform public.soghi_assert(not exists(select 1 from jsonb_array_elements(p_data->'settlements') x where not exists(select 1 from public.soghi_settlements old where old.account_id=p_account and old.data=x)),'Xác nhận kết sổ cần thực hiện qua máy chủ.');
    end if;
  end if;
end $$;
create or replace function public.soghi_write_data(p_account uuid,p_data jsonb) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare r jsonb; d jsonb; a jsonb; eid text;
begin
  -- Chỉ thay dữ liệu của tài khoản đã xác thực; mọi thao tác cùng một transaction.
  delete from public.soghi_settlement_advances where account_id=p_account;
  delete from public.soghi_settlement_entries where account_id=p_account;
  delete from public.soghi_settlements where account_id=p_account;
  delete from public.soghi_entries where account_id=p_account;
  delete from public.soghi_advances where account_id=p_account;
  delete from public.soghi_rates where account_id=p_account;
  delete from public.soghi_harvesters where account_id=p_account;
  insert into public.soghi_harvesters select p_account,x->>'id',x->>'name',x,(x->>'createdAt')::timestamptz,(x->>'updatedAt')::timestamptz from jsonb_array_elements(p_data->'harvesters') x;
  insert into public.soghi_entries select p_account,x->>'id',x->>'harvesterId',(x->>'date')::date,(x->>'kg')::numeric,x,(x->>'createdAt')::timestamptz,(x->>'updatedAt')::timestamptz from jsonb_array_elements(p_data->'entries') x;
  insert into public.soghi_rates select p_account,x->>'id',x->>'harvesterId',(x->>'effectiveDate')::date,(x->>'amount')::bigint,x,(x->>'createdAt')::timestamptz,(x->>'updatedAt')::timestamptz from jsonb_array_elements(p_data->'rates') x;
  insert into public.soghi_advances select p_account,x->>'id',x->>'harvesterId',(x->>'date')::date,(x->>'amount')::bigint,x->>'note',x,(x->>'createdAt')::timestamptz,(x->>'updatedAt')::timestamptz from jsonb_array_elements(p_data->'advances') x;
  insert into public.soghi_settlements select p_account,x->>'id',x->>'harvesterId',(x->>'totalKg100')::bigint,(x->>'gross')::bigint,(x->>'advanceApplied')::bigint,(x->>'payable')::bigint,x,(x->>'createdAt')::timestamptz,(x->>'updatedAt')::timestamptz from jsonb_array_elements(p_data->'settlements') x;
  insert into public.soghi_settlement_entries(account_id,settlement_id,entry_id) select p_account,s->>'id',e from jsonb_array_elements(p_data->'settlements') s cross join lateral jsonb_array_elements_text(s->'entryIds') e;
  insert into public.soghi_settlement_advances(account_id,settlement_id,advance_id,amount) select p_account,s->>'id',allocation.doc->>'advanceId',(allocation.doc->>'amount')::bigint from jsonb_array_elements(p_data->'settlements') s cross join lateral jsonb_array_elements(s->'advanceAllocations') as allocation(doc);
  insert into public.soghi_settings(account_id,theme) values(p_account,p_data#>>'{settings,theme}') on conflict(account_id) do update set theme=excluded.theme,updated_at=now();
  update public.soghi_accounts set revision=revision+1,updated_at=now() where id=p_account;
end $$;
create or replace function public.soghi_save(p_token text,p_revision bigint,p_request_id uuid,p_data jsonb,p_replace boolean default false,p_import boolean default false) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare aid uuid:=public.soghi_account(p_token); rev bigint; prior text;
  fingerprint text:=public.soghi_hash(jsonb_build_array(p_revision,p_data,p_replace,p_import)::text);
begin
  select revision into rev from public.soghi_accounts where id=aid for update;
  select request_hash into prior from public.soghi_requests where account_id=aid and request_id=p_request_id;
  if prior is not null then
    perform public.soghi_assert(prior=fingerprint,'Mã đồng bộ đã dùng cho dữ liệu khác.'); return public.soghi_snapshot_internal(aid);
  end if;
  if rev<>p_revision then return jsonb_build_object('ok',false,'error','REVISION_CONFLICT','message','Dữ liệu đã thay đổi ở thiết bị khác.','snapshot',public.soghi_snapshot_internal(aid)); end if;
  perform public.soghi_validate_data(p_data,aid,p_replace,p_import);
  perform public.soghi_write_data(aid,p_data);
  insert into public.soghi_requests(account_id,request_id,request_hash,revision) values(aid,p_request_id,fingerprint,rev+1);
  return public.soghi_snapshot_internal(aid);
end $$;
create or replace function public.soghi_settle(p_token text,p_revision bigint,p_request_id uuid,p_harvester_id text,p_mode text,p_from text default '',p_to text default '') returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare aid uuid:=public.soghi_account(p_token); rev bigint; prior text;
  fingerprint text:=public.soghi_hash(jsonb_build_array('settle',p_revision,p_harvester_id,p_mode,p_from,p_to)::text);
  state jsonb; person_name text; e record; rate record; a record;
  days jsonb:='[]'; allocations jsonb:='[]'; entry_ids jsonb:='[]'; day jsonb;
  day_date date; day_kg bigint:=0; gross bigint:=0; total_kg bigint:=0; available bigint:=0; applied bigint:=0; to_apply bigint; portion bigint;
  stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  sid text:=gen_random_uuid()::text; settlement jsonb;
begin
  select revision into rev from public.soghi_accounts where id=aid for update;
  select request_hash into prior from public.soghi_requests where account_id=aid and request_id=p_request_id;
  if prior is not null then perform public.soghi_assert(prior=fingerprint,'Mã kết sổ đã dùng cho dữ liệu khác.'); return public.soghi_snapshot_internal(aid); end if;
  if rev<>p_revision then return jsonb_build_object('ok',false,'error','REVISION_CONFLICT','message','Dữ liệu vừa thay đổi. Tính lại trước khi kết sổ.','snapshot',public.soghi_snapshot_internal(aid)); end if;
  perform public.soghi_assert(p_mode in ('range','all'),'Phạm vi kết sổ không hợp lệ.');
  if p_mode='range' then perform public.soghi_assert(p_from::date::text=p_from and p_to::date::text=p_to and p_from<=p_to,'Khoảng ngày không hợp lệ.'); end if;
  select name into person_name from public.soghi_harvesters where account_id=aid and id=p_harvester_id;
  perform public.soghi_assert(person_name is not null,'Không tìm thấy người hái.');
  for e in select entry_date,sum(kg*100)::bigint as kg100,jsonb_agg(id order by created_at,id) as ids
    from public.soghi_entries en where account_id=aid and harvester_id=p_harvester_id
      and (p_mode='all' or (entry_date>=p_from::date and entry_date<=p_to::date))
      and not exists(select 1 from public.soghi_settlement_entries se where se.account_id=aid and se.entry_id=en.id)
    group by entry_date order by entry_date
  loop
    select id,amount into rate from public.soghi_rates where account_id=aid and (harvester_id=p_harvester_id or harvester_id is null)
      and effective_date<=e.entry_date order by (harvester_id is not null) desc,effective_date desc,id desc limit 1;
    perform public.soghi_assert(rate.id is not null,'Chưa có đơn giá cho ngày '||e.entry_date::text||'.');
    perform public.soghi_assert(e.kg100::numeric*rate.amount<=9007199254740991,'Sản lượng/đơn giá quá lớn để tính chính xác.');
    day:=jsonb_build_object('date',e.entry_date,'rateId',rate.id,'rate',rate.amount,'kg100',e.kg100,'amount',round(e.kg100::numeric*rate.amount/100)::bigint,'entryIds',e.ids);
    days:=days||jsonb_build_array(day); entry_ids:=entry_ids||e.ids;
    total_kg:=total_kg+e.kg100; gross:=gross+(day->>'amount')::bigint;
  end loop;
  perform public.soghi_assert(jsonb_array_length(entry_ids)>0,'Không có số kg chưa kết toán trong thời gian này.');
  for a in select ad.*,ad.amount-coalesce((select sum(sa.amount) from public.soghi_settlement_advances sa where sa.account_id=aid and sa.advance_id=ad.id),0)::bigint as remaining
    from public.soghi_advances ad where account_id=aid and harvester_id=p_harvester_id and (p_mode='all' or advance_date<=p_to::date)
    order by advance_date,created_at,id
  loop available:=available+a.remaining; end loop;
  applied:=least(gross,available); to_apply:=applied;
  for a in select ad.*,ad.amount-coalesce((select sum(sa.amount) from public.soghi_settlement_advances sa where sa.account_id=aid and sa.advance_id=ad.id),0)::bigint as remaining
    from public.soghi_advances ad where account_id=aid and harvester_id=p_harvester_id and (p_mode='all' or advance_date<=p_to::date)
    order by advance_date,created_at,id
  loop
    portion:=least(to_apply,a.remaining);
    if portion>0 then allocations:=allocations||jsonb_build_array(jsonb_build_object('advanceId',a.id,'date',a.advance_date,'amount',portion,'note',a.note)); end if;
    to_apply:=to_apply-portion;
  end loop;
  settlement:=jsonb_build_object('id',sid,'harvesterId',p_harvester_id,'personName',person_name,'mode',p_mode,
    'from',case when p_mode='all' then '' else p_from end,'to',case when p_mode='all' then '' else p_to end,
    'entryIds',entry_ids,'days',days,'totalKg100',total_kg,'gross',gross,'availableAdvance',available,
    'advanceApplied',applied,'payable',gross-applied,'carry',available-applied,'advanceAllocations',allocations,'createdAt',stamp,'updatedAt',stamp);
  state:=public.soghi_snapshot_internal(aid)->'data';
  state:=jsonb_set(state,'{settlements}',(state->'settlements')||jsonb_build_array(settlement));
  perform public.soghi_assert(gross<=9007199254740991 and available<=9007199254740991 and total_kg<=9007199254740991,'Tổng tiền quá lớn để tính chính xác.');
  insert into public.soghi_settlements values(aid,sid,p_harvester_id,total_kg,gross,applied,gross-applied,settlement,stamp::timestamptz,stamp::timestamptz);
  insert into public.soghi_settlement_entries(account_id,settlement_id,entry_id) select aid,sid,id from jsonb_array_elements_text(entry_ids) id;
  insert into public.soghi_settlement_advances(account_id,settlement_id,advance_id,amount) select aid,sid,v->>'advanceId',(v->>'amount')::bigint from jsonb_array_elements(allocations) v;
  update public.soghi_accounts set revision=revision+1,updated_at=now() where id=aid;
  insert into public.soghi_requests(account_id,request_id,request_hash,revision) values(aid,p_request_id,fingerprint,rev+1);
  return public.soghi_snapshot_internal(aid)||jsonb_build_object('settlementId',sid);
end $$;
-- Các bảng chỉ được truy cập thông qua RPC kiểm tra phiên đăng nhập.
do $soghi_permissions$
declare t record; f record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname=any(array['soghi_schema','soghi_accounts','soghi_sessions','soghi_harvesters','soghi_entries','soghi_rates','soghi_advances','soghi_settlements','soghi_settlement_entries','soghi_settlement_advances','soghi_settings','soghi_requests']) loop
    execute format('alter table public.%I enable row level security',t.relname);
    execute format('revoke all on table public.%I from public,anon,authenticated',t.relname);
  end loop;
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['soghi_hash','soghi_pin_create','soghi_pin_matches','soghi_random_token','soghi_username_key','soghi_account','soghi_new_session','soghi_register','soghi_login','soghi_logout','soghi_head','soghi_snapshot_internal','soghi_pull','soghi_assert','soghi_validate_data','soghi_write_data','soghi_save','soghi_settle']) loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  end loop;
end
$soghi_permissions$;
grant execute on function public.soghi_register(text,text,text),public.soghi_login(text,text),public.soghi_logout(text),
  public.soghi_head(text),public.soghi_pull(text),public.soghi_save(text,bigint,uuid,jsonb,boolean,boolean),
  public.soghi_settle(text,bigint,uuid,text,text,text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
