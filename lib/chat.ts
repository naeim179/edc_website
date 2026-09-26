import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversationListItem {
  id: string;
  student_id: string;
  teacher_id: string;
  course_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number; // محسوب حسب دور المستخدم الحالي
  course_title: string;
  other_party_name: string;
}


type ConversationRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  course_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  student_unread_count?: number | null;
  teacher_unread_count?: number | null;
  course?: { title: string | null }[] | null;
  student?: { full_name: string | null }[] | null;
  teacher?: { full_name: string | null }[] | null;
};

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export async function getConversationsForUser(
  supabase: SupabaseClient,
  userId: string,
  role: "student" | "teacher"
): Promise<ConversationListItem[]> {
  const matchColumn = role === "student" ? "student_id" : "teacher_id";

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      student_id,
      teacher_id,
      course_id,
      last_message_at,
      last_message_preview,
      student_unread_count,
      teacher_unread_count,
      course:courses ( title ),
      student:profiles!conversations_student_id_fkey ( full_name ),
      teacher:profiles!conversations_teacher_id_fkey ( full_name )
    `
    )
    .eq(matchColumn, userId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("getConversationsForUser error:", error.message);
    throw new Error("تعذر تحميل المحادثات");
  }

  return (data ?? []).map((row: ConversationRow) => ({
    id: row.id,
    student_id: row.student_id,
    teacher_id: row.teacher_id,
    course_id: row.course_id,
    last_message_at: row.last_message_at,
    last_message_preview: row.last_message_preview,
    unread_count:
      role === "student"
        ? row.student_unread_count ?? 0
        : row.teacher_unread_count ?? 0,
    course_title: row.course?.[0]?.title ?? "",
    other_party_name:
      role === "student"
        ? row.teacher?.[0]?.full_name ?? "المدرس"
        : row.student?.[0]?.full_name ?? "الطالب",
  }));
}

// للأدمن: كل المحادثات على المنصة (view-only أصلًا محمي من RLS)
export async function getAllConversationsForAdmin(
  supabase: SupabaseClient
): Promise<ConversationListItem[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      student_id,
      teacher_id,
      course_id,
      last_message_at,
      last_message_preview,
      course:courses ( title ),
      student:profiles!conversations_student_id_fkey ( full_name ),
      teacher:profiles!conversations_teacher_id_fkey ( full_name )
    `
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("getAllConversationsForAdmin error:", error.message);
    throw new Error("تعذر تحميل المحادثات");
  }

  return (data ?? []).map((row: ConversationRow) => ({
    id: row.id,
    student_id: row.student_id,
    teacher_id: row.teacher_id,
    course_id: row.course_id,
    last_message_at: row.last_message_at,
    last_message_preview: row.last_message_preview,
    unread_count: 0,
    course_title: row.course?.[0]?.title ?? "",
    other_party_name: `${row.student?.[0]?.full_name ?? "طالب"} ↔ ${row.teacher?.[0]?.full_name ?? "مدرس"}`,
  }));
}

export async function getConversationById(
  supabase: SupabaseClient,
  conversationId: string
) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, student_id, teacher_id, course_id")
    .eq("id", conversationId)
    .single();

  if (error) return null;
  return data;
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getMessages error:", error.message);
    throw new Error("تعذر تحميل الرسائل");
  }

  return data ?? [];
}
