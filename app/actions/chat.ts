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

export async function sendMessage(
  conversationId: string,
  content: string,
  attachment?: {
    url: string;
    name: string;
    size: number;
    type: "image" | "file";
  }
) {
  const trimmed = content.trim();

  if (!trimmed && !attachment) {
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
    content: trimmed || " ",
    message_type: attachment?.type ?? "text",
    attachment_url: attachment?.url ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_size: attachment?.size ?? null,
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

export async function editMessage(
  messageId: string,
  content: string
) {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error("الرسالة لا يمكن أن تكون فارغة");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول");
  }

  const { error } = await supabase
    .from("messages")
    .update({
      content: trimmed,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}


export async function deleteMessage(
  messageId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول");
  }

  const { error } = await supabase
    .from("messages")
    .update({
      deleted_at: new Date().toISOString(),
      content: "",
    })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

