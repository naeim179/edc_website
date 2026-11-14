import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupportOptions } from "./types";
export async function requireSupportUser(staff = false) {
 const db = await createClient();
 const { data: { user },error } = await db.auth.getUser();
 if (error || !user) redirect("/login");
 if (staff) {
  const { data: p } = await db.from("profiles").select("role,is_super_admin,permissions").eq("id",user.id).maybeSingle();
  if (!p || p.role!=="admin" || (!p.is_super_admin && !p.permissions?.includes("manage_support"))) redirect("/");
 }
 return { db,user };
}
export async function getSupportOptions(): Promise<SupportOptions> {
 const { db,user } = await requireSupportUser();
 const [enrollments,instructors,orders] = await Promise.all([
  db.from("enrollments").select("course_id,courses(title)").eq("student_id",user.id).limit(100),
  db.from("course_instructors").select("course_id,courses(title)").eq("teacher_id",user.id).limit(100),
  db.from("orders").select("id,course_id,created_at,courses(title)").eq("user_id",user.id).order("created_at",{ ascending: false }).limit(50),
 ]);
 const courses = new Map<string,{ id: string; title: string }>();
 type Row = { id?: string; course_id: string; courses: { title: string } | { title: string }[] | null };
 const title = (r: Row) => Array.isArray(r.courses) ? r.courses[0]?.title : r.courses?.title;
 for (const row of [...enrollments.data ?? [],...instructors.data ?? [],...orders.data ?? []] as Row[]) {
  const text = title(row); if (text) courses.set(row.course_id,{ id: row.course_id,title: text });
 }
 return { courses: [...courses.values()],orders: (orders.data as Row[] ?? []).map(r => ({ id: r.id!,course_id: r.course_id,label: `${r.id!.slice(0,8)} · ${title(r) ?? ""}` })) };
}
