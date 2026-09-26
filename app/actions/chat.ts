"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function startConversation(courseId: string, teacherId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const { data: conversationId, error } = await supabase.rpc(
    "start_conversation",
    { p_course_id: courseId, p_teacher_id: teacherId }
  );

  if (error) {
    console.error("startConversation error:", error.message);
    throw new Error(error.message || "تعذر بدء المحادثة");
  }

  return conversationId as string;
}

export async function sendMessage(conversationId: string, content: string) {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error("لا يمكن إرسال رسالة فارغة");
  }
  if (trimmed.length > 4000) {
    throw new Error("الرسالة طويلة جدًا");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) {
    console.error("sendMessage error:", error.message, error.code, error.details, error.hint);
    throw new Error(`تعذر إرسال الرسالة: ${error.message}`);
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (error) {
    console.error("markConversationRead error:", error.message);
  }

  revalidatePath("/messages");
}
