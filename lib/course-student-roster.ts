import type { SupabaseClient } from "@supabase/supabase-js";
export async function getCourseStudentRoster(db: SupabaseClient, courseIds: string[]) {
  if (!courseIds.length) return [];
  const {data: enrollments,error} = await db.from("enrollments").select("course_id,student_id").in("course_id",courseIds);
  if(error) throw new Error(error.message);
  const ids=[...new Set((enrollments??[]).map(e=>String(e.student_id)))];
  const [people, bookings] = await Promise.all([
    ids.length ? db.from("profiles").select("id,full_name,username").in("id",ids) : Promise.resolve({data:[],error:null}),
    db.from("private_course_bookings").select("id,course_id,student_id").in("course_id",courseIds).eq("status","confirmed"),
  ]);
  if(people.error||bookings.error) throw new Error(people.error?.message??bookings.error?.message);
  const bookingIds=(bookings.data??[]).map(b=>String(b.id));
  const slots=bookingIds.length ? await db.from("private_booking_slots").select("booking_id,day_of_week,start_time,end_time").in("booking_id",bookingIds) : {data:[],error:null};
  if(slots.error)throw new Error(slots.error.message);
  return (enrollments??[]).map(e=>{
    const person=(people.data??[]).find(p=>p.id===e.student_id);
    const booking=(bookings.data??[]).find(b=>b.course_id===e.course_id&&b.student_id===e.student_id);
    return {courseId:String(e.course_id),studentId:String(e.student_id),name:String(person?.full_name||person?.username||"طالب"),slots:(slots.data??[]).filter(s=>s.booking_id===booking?.id).map(s=>({day:Number(s.day_of_week),start:String(s.start_time).slice(0,5),end:String(s.end_time).slice(0,5)}))};
  });
}
