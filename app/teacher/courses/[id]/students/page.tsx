import { cookies } from "next/headers";
import Link from "next/link";
import {notFound} from "next/navigation";
import AppShell from "@/components/AppShell";
import {requireTeacher} from "@/lib/auth/require-teacher";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCourseStudentRoster} from "@/lib/course-student-roster";

export default async function CourseStudentsPage({params}:{params:Promise<{id:string}>}) {
 const en=(await cookies()).get("app-language")?.value==="en";
 const user=await requireTeacher();const {id}=await params;const db=createAdminClient();
 const {data:owned}=await db.from("course_instructors").select("id").eq("course_id",id).eq("teacher_id",user.id).maybeSingle();
 if(!owned)notFound();
 const [{data:course},roster,work,submissions]=await Promise.all([
  db.from("courses").select("id,title,course_type,group_day_of_week,group_start_time,group_end_time").eq("id",id).maybeSingle(),
  getCourseStudentRoster(db,[id]),db.from("assignments").select("id,title,target_student_id,is_published").eq("course_id",id).order("created_at",{ascending:false}),
  db.from("assignment_submissions").select("assignment_id,student_id,status,score,assignment:assignments!inner(course_id)").eq("assignment.course_id",id),
 ]);
 if(!course)notFound();if(work.error||submissions.error)throw new Error(work.error?.message??submissions.error?.message);
 const days=en?["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]:["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
 const labels:Record<string,string>=en?{draft:"Draft — not submitted",submitted:"Submitted",late:"Late",graded:"Graded",returned:"Returned for revision"}:{draft:"مسودة — لم يُسلّم",submitted:"تم التسليم",late:"تسليم متأخر",graded:"تم التقييم",returned:"أُعيد للتعديل"};
 return <AppShell><div dir={en?"ltr":"rtl"} className="mx-auto max-w-6xl space-y-6">
  <Link href={`/teacher/courses/${id}`} className="inline-block rounded-xl border px-4 py-2">{en?"Back to course":"العودة للدورة"}</Link>
  <header><h1 className="text-2xl font-bold">{en?"Students in ":"طلاب "}{course.title}</h1><p className="mt-2 text-sm text-[var(--brand-text-muted)]">{course.course_type==='private'?(en?"Each student’s schedule and individual assignments":"مواعيد وواجبات كل طالب بشكل مستقل"):(en?"Group assignments and each student’s submissions":"واجبات القروب وحالة تسليم كل طالب")}</p></header>
  {roster.length===0&&<p className="rounded-xl border p-6">{en?"No students enrolled yet.":"لا يوجد طلاب مسجلون بعد."}</p>}
  {roster.map(student=>{const tasks=(work.data??[]).filter(a=>a.target_student_id===student.studentId||a.target_student_id===null);return <section key={student.studentId} className="min-w-0 rounded-2xl border bg-[var(--brand-surface)] p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{student.name}</h2><Link href={`/teacher/assignments?course=${id}&student=${student.studentId}`} className="rounded-xl border px-4 py-2 font-bold">{course.course_type==='private'?(en?"Assign to this student":"إسناد واجب لهذا الطالب"):(en?"Add group assignment":"إضافة واجب للقروب")}</Link></div>
   <div className="mt-3 flex flex-wrap gap-2">{course.course_type==='private' ? student.slots.length?student.slots.map((s,i)=><span key={i} className="rounded-lg border px-3 py-2 text-sm">{days[s.day]} · <b dir="ltr">{s.start}–{s.end}</b></span>):<p className="text-sm">{en?"No confirmed appointments yet.":"لا توجد مواعيد مؤكدة لهذا الطالب بعد."}</p>:<p className="text-sm">{en?"Group schedule: ":"موعد القروب: "}{course.group_day_of_week==null?(en?"Not specified":"غير محدد"):days[course.group_day_of_week]} · {course.group_start_time?.slice(0,5)??"—"}–{course.group_end_time?.slice(0,5)??"—"}</p>}</div>
   <ul className="mt-4 space-y-2">{tasks.map(a=>{const answer=(submissions.data??[]).find(s=>s.assignment_id===a.id&&s.student_id===student.studentId);return <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"><Link href={`/teacher/assignment-submissions/${a.id}`} className="font-semibold underline underline-offset-4">{a.title}{!a.is_published?(en?" (unpublished)":" (غير منشور)"):""}</Link><span className="text-sm">{answer?labels[answer.status]??answer.status:(en?"Not submitted":"لم يُسلّم")}{answer?.score!=null?` · ${answer.score}`:""}</span></li>})}</ul>
   {tasks.length===0&&<p className="mt-4 text-sm text-[var(--brand-text-muted)]">{en?"No assignments yet.":"لا توجد واجبات مسندة بعد."}</p>}
  </section>})}
 </div></AppShell>;
}
