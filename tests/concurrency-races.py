"""Two real PostgreSQL sessions; only run against run-db-tests.sh's disposable container."""
import os
import subprocess
import sys
import time
from pathlib import Path

container = sys.argv[1]
env = {k: v for k, v in os.environ.items() if k not in ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH')}
command = ['docker', '--host=unix:///var/run/docker.sock', 'exec', '-i', container, 'psql', '-U', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At']

def sql(text):
    return subprocess.run(command, input=text, text=True, capture_output=True, check=True, env=env).stdout.strip()

def race(name, first, second):
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)
    process.stdin.write("begin; set application_name='" + name + "';" + first + '; select pg_sleep(2); commit;')
    process.stdin.close()
    for _ in range(100):
        if sql("select count(*) from pg_stat_activity where application_name='" + name + "' and wait_event='PgSleep';") == '1':
            break
        if process.poll() is not None:
            raise RuntimeError(process.stderr.read())
        time.sleep(.03)
    else:
        process.kill()
        raise RuntimeError('Lock-holder did not reach barrier')
    started = time.monotonic()
    sql(second)
    assert time.monotonic() - started > .5, 'Second session did not wait for row lock'
    assert process.wait(timeout=10) == 0, process.stderr.read()
    print('PASS real database race:', name)

prefix = Path('tests/concurrency-regression.sql').read_text().split('do $$')[0]
sql(prefix + '\ncommit;')
student = 'e0000000-0000-4000-8000-000000000001'
assignment = 'e2000000-0000-4000-8000-000000000001'
course = 'e1000000-0000-4000-8000-000000000001'
race('assignment_race', f"select write_assignment_submission('{assignment}','{student}','{{\"text\":\"answer\"}}',true)", f"do $$ begin begin perform write_assignment_submission('{assignment}','{student}','{{\"text\":\"stale\"}}',false); raise exception 'Draft overwrote submitted'; exception when others then if sqlerrm<>'Submission is locked' then raise; end if; end; end $$;")
assert sql(f"select status||':'||attempt_number from assignment_submissions where assignment_id='{assignment}';") == 'submitted:1'
sql(f"delete from assignment_submissions where assignment_id='{assignment}';")
race('attempt_cap_race', f"select write_assignment_submission('{assignment}','{student}','{{\"text\":\"first\"}}',true)", f"do $$ begin begin perform write_assignment_submission('{assignment}','{student}','{{\"text\":\"second\"}}',true); raise exception 'Attempt limit bypassed'; exception when others then if sqlerrm<>'No attempts remaining' then raise; end if; end; end $$;")
submission, revision = sql(f"select id||'|'||revision from assignment_submissions where assignment_id='{assignment}';").split('|')
teacher = 'e0000000-0000-4000-8000-000000000002'
race('review_race', f"select review_assignment_submission('{assignment}','{submission}','{teacher}',{revision},true,null,'Try again')", f"do $$ begin begin perform review_assignment_submission('{assignment}','{submission}','{teacher}',{revision},false,90,'stale');raise exception 'Stale grade accepted';exception when others then if sqlerrm<>'Submission changed; refresh and try again' then raise;end if;end;end $$;")
sub = 'e3000000-0000-4000-8000-000000000001'
nonce = 'e4000000-0000-4000-8000-000000000001'
sql(f"insert into subscriptions(id,student_id,course_id,duration_months,amount,currency,status,expires_at,auto_renew,renewal_claim_id) values('{sub}','{student}','{course}',1,25,'USD','active',now()+interval '1 hour',true,'{nonce}');insert into subscription_payment_tokens(subscription_id,token,token_tran_ref) values('{sub}','fake-token','fake-ref');")
race('optout_wins', f"select set_config('request.jwt.claim.sub','{student}',true);select disable_subscription_auto_renew('{course}')", f"do $$ begin if begin_subscription_renewal('{sub}','{nonce}') is not null then raise exception 'Cancelled claim started'; end if; end $$;")
assert sql("select count(*) from orders where source='auto_renew';") == '0'
sql(f"update subscriptions set auto_renew=true,renewal_claim_id='{nonce}' where id='{sub}';insert into subscription_payment_tokens(subscription_id,token,token_tran_ref) values('{sub}','fake-token','fake-ref');")
race('start_wins', f"select begin_subscription_renewal('{sub}','{nonce}')", f"select set_config('request.jwt.claim.sub','{student}',false);do $$ declare r jsonb; begin r:=disable_subscription_auto_renew('{course}');if not (r->>'in_flight')::boolean then raise exception 'In-flight start hidden'; end if;end $$;")
assert sql(f"select auto_renew from subscriptions where id='{sub}';") == 'f'
assert sql(f"select count(*) from subscription_payment_tokens where subscription_id='{sub}';") == '0'

private_a='e5000000-0000-4000-8000-000000000001'
private_b='e5000000-0000-4000-8000-000000000002'
other='e6000000-0000-4000-8000-000000000001'
sql(f"insert into auth.users(id,email) values('{other}','other-slot@test.invalid');insert into courses(id,title,price,course_type,is_published,registration_open) values('{private_a}','First private',25,'private',true,true),('{private_b}','Second private',25,'private',true,true);insert into course_instructors(course_id,teacher_id) values('{private_a}','{teacher}'),('{private_b}','{teacher}');insert into private_course_availability(course_id,day_of_week,start_time,end_time,is_active) values('{private_a}',1,'10:00','11:00',true),('{private_a}',3,'10:00','11:00',true),('{private_b}',1,'10:00','11:00',true),('{private_b}',3,'10:00','11:00',true);")
race('private_teacher_overlap', f"select set_config('request.jwt.claim.sub','{student}',true);select reserve_private_course('{private_a}',(select array_agg(id) from private_course_availability where course_id='{private_a}'))", f"select set_config('request.jwt.claim.sub','{other}',false);do $$ begin begin perform reserve_private_course('{private_b}',(select array_agg(id) from private_course_availability where course_id='{private_b}'));raise exception 'Teacher double-booked';exception when others then if sqlerrm<>'Invalid availability selection' then raise;end if;end;end $$;")
