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

# Upload quotas and linking/cleanup must serialize in real sessions, not just
# in application memory. No provider or paid service is used by these races.
sql(f"select set_config('request.jwt.claim.sub','{teacher}',false);select reserve_lesson_video_upload('{course}','bunny',4,'video/mp4');")
race('upload_quota_race', f"select set_config('request.jwt.claim.sub','{teacher}',true);select reserve_lesson_video_upload('{course}','bunny',4,'video/mp4')", f"select set_config('request.jwt.claim.sub','{teacher}',false);do $$ begin begin perform reserve_lesson_video_upload('{course}','mux',4,'video/mp4');raise exception 'Concurrent quota bypass';exception when others then if sqlerrm<>'UPLOAD_ACTIVE_LIMIT' then raise;end if;end;end $$;")
assert sql(f"select count(*) from lesson_video_uploads where course_id='{course}' and state='reserved';") == '2'
upload='e7000000-0000-4000-8000-000000000001'
section='e8000000-0000-4000-8000-000000000001'
sql(f"insert into sections(id,course_id,title,order_index) values('{section}','{course}','Upload race',1);insert into lesson_video_uploads(id,course_id,created_by,provider,expected_bytes,mime_type,state,provider_upload_id,provider_asset_id,library_id,created_at,expires_at) values('{upload}','{course}','{teacher}','bunny',4,'video/mp4','ready','race-video','race-video','race-library',now()-interval '2 days',now()-interval '1 hour');")
race('video_cleanup_wins', f"select claim_stale_video_upload('{upload}')", f"do $$ begin begin insert into lessons(section_id,title,video_provider,bunny_video_id,bunny_library_id) values('{section}','Blocked video','bunny','race-video','race-library');raise exception 'Deleting video attached';exception when others then if sqlerrm<>'VIDEO_NOT_READY_OR_WRONG_COURSE' then raise;end if;end;end $$;")
sql(f"update lesson_video_uploads set state='ready' where id='{upload}';")
race('video_link_wins', f"insert into lessons(section_id,title,video_provider,bunny_video_id,bunny_library_id) values('{section}','Preserved video','bunny','race-video','race-library')", f"do $$ begin begin perform claim_stale_video_upload('{upload}');raise exception 'Linked video deleted';exception when others then if sqlerrm<>'UPLOAD_ALREADY_LINKED' then raise;end if;end;end $$;")
assert sql("select count(*) from lessons where bunny_video_id='race-video';") == '1'
sql(f"update lesson_video_uploads set state='reserved',provider_upload_id='claim-race-'||id::text where course_id='{course}' and id<>'{upload}';")
claim=sql(f"select id from lesson_video_uploads where course_id='{course}' and state='reserved' limit 1;")
race('upload_transfer_claim', f"select claim_lesson_video_upload('{claim}','{course}')", f"do $$ begin begin perform claim_lesson_video_upload('{claim}','{course}');raise exception 'Upload target reused';exception when others then if sqlerrm<>'UPLOAD_NOT_AVAILABLE' then raise;end if;end;end $$;")

# Support transactions serialize duplicate submissions, staff edits and file linking.
support_owner='e9000000-0000-4000-8000-000000000001'
support_staff='e9000000-0000-4000-8000-000000000002'
support_request='e9100000-0000-4000-8000-000000000001'
sql(f"insert into auth.users(id,email) values('{support_owner}','support-race@test.invalid'),('{support_staff}','support-staff-race@test.invalid');update profiles set role='admin',permissions=array['manage_support'] where id='{support_staff}';")
first=f"set local role authenticated;select set_config('request.jwt.claim.sub','{support_owner}',true);select support_create_ticket('{support_request}','Concurrent complaint','Description for a concurrent complaint.','other')"
second=f"set role authenticated;select set_config('request.jwt.claim.sub','{support_owner}',false);select support_create_ticket('{support_request}','Concurrent complaint','Description for a concurrent complaint.','other')"
race('support_duplicate_create',first,second)
support_ticket=sql(f"select id from support_tickets where request_id='{support_request}';")
assert sql(f"select count(*) from support_tickets where request_id='{support_request}';")=='1'
race('support_stale_management',f"set local role authenticated;select set_config('request.jwt.claim.sub','{support_staff}',true);select support_update_ticket('{support_ticket}',1,'in_progress','high')",f"set role authenticated;select set_config('request.jwt.claim.sub','{support_staff}',false);do $$ begin begin perform support_update_ticket('{support_ticket}',1,'resolved','normal');raise exception 'Stale support update accepted';exception when others then if sqlerrm<>'SUPPORT_STALE' then raise;end if;end;end $$;")
assert sql(f"select status||':'||priority from support_tickets where id='{support_ticket}';")=='in_progress:high'
attachment=sql(f"set role authenticated;select set_config('request.jwt.claim.sub','{support_owner}',false);select support_reserve_file('{support_ticket}','proof.pdf','application/pdf',8)->>'id';").splitlines()[-1]
sql(f"set role authenticated;select set_config('request.jwt.claim.sub','{support_owner}',false);insert into storage.objects(bucket_id,name) select 'support-files',path from support_attachments where id='{attachment}';select support_finish_file('{attachment}');")
race('support_link_wins',f"set local role authenticated;select set_config('request.jwt.claim.sub','{support_owner}',true);select support_reply('{support_ticket}',gen_random_uuid(),'Attached proof',false,array['{attachment}'::uuid])",f"set role authenticated;select set_config('request.jwt.claim.sub','{support_owner}',false);do $$ begin begin perform support_finish_file('{attachment}',true);raise exception 'Linked support file cancelled';exception when insufficient_privilege then null;end;end $$;")
