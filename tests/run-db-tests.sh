#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
db_container="edc-security-test-$$"
docker_local() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock "$@"
}
trap 'docker_local rm -f -v "$db_container" >/dev/null 2>&1 || true' EXIT
docker_local run -d --name "$db_container" -e POSTGRES_PASSWORD=disposable-test-only postgres:17 >/dev/null
ready=false
for ((attempt=0; attempt<60; attempt++)); do
  # The image's temporary init server listens only on a Unix socket. Wait for
  # TCP readiness so psql cannot race that temporary server's shutdown.
  if docker_local exec "$db_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then echo 'Test PostgreSQL did not start' >&2; exit 1; fi
psql_local() { docker_local exec -i "$db_container" psql -U postgres -X -v ON_ERROR_STOP=1 "$@"; }
psql_local -q < tests/db-bootstrap.sql
for migration in supabase/migrations/*.sql; do
  echo "Applying $migration"
  if [[ "$migration" == *complete_username_schema.sql ]]; then
    docker_local exec "$db_container" createdb -U postgres -T postgres edc_legacy_username
    psql_local -q --dbname=edc_legacy_username <<'SQL'
alter table public.profiles add column username text;
create unique index profiles_username_lower_idx on public.profiles (lower(username));
SQL
    psql_local -q -1 --dbname=edc_legacy_username < "$migration"
    psql_local -q --dbname=edc_legacy_username <<'SQL'
do $$ begin
  if (select count(*) from pg_index i where i.indrelid='public.profiles'::regclass
    and i.indisunique and pg_get_indexdef(i.indexrelid,1,true)='lower(username)') <> 1 then
    raise exception 'Username repair created a duplicate index';
  end if;
end $$;
SQL
  fi
  psql_local -q -1 < "$migration"
done
psql_local < tests/security-regression.sql
echo 'All migrations and database security checks passed.'
