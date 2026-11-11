#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
benchmark_container="edc-query-benchmark-$$"
benchmark_dir="${BENCHMARK_OUTPUT_DIR:-/tmp/edc-query-benchmark}"
mkdir -p "$benchmark_dir"
docker_local(){ env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
trap 'docker_local rm -f -v "$benchmark_container" >/dev/null 2>&1 || true' EXIT
docker_local run -d --name "$benchmark_container" -e POSTGRES_PASSWORD=disposable-benchmark-only "${TEST_POSTGRES_IMAGE:-postgres:17-alpine}" >/dev/null
for ((i=0;i<60;i++));do if docker_local exec "$benchmark_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1;then break;fi;sleep 1;done
psql_local(){ docker_local exec -i "$benchmark_container" psql -U postgres -X -qAt -v ON_ERROR_STOP=1 "$@"; }
psql_local < tests/db-bootstrap.sql
for migration in supabase/migrations/*.sql; do
 if [[ "$migration" == *optimize_query_paths_and_upload_lifecycle.sql ]];then
  psql_local < tests/query-performance.sql > "$benchmark_dir/before.json"
  psql_local -1 < "$migration"
  psql_local < tests/query-performance.sql > "$benchmark_dir/after.json"
  break
 fi
 psql_local -1 < "$migration"
done
python3 - "$benchmark_dir" <<'PY'
import json,sys
from pathlib import Path
p=Path(sys.argv[1]);before=json.loads((p/'before.json').read_text());after=json.loads((p/'after.json').read_text())
for name in before:
 a=before[name][0]['Execution Time'];b=after[name][0]['Execution Time']
 print(f'{name}: before={a:.3f} ms after={b:.3f} ms ratio={a/b:.2f}x')
PY
