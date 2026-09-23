"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getOrCreateConversation(
  courseId: string,
  teacherId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: existing, error: existingError } =
    await supabase
      .from("conversations")
      .select("*")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .eq("teacher_id", teacherId)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing;
  }

  const { data: conversation, error } =
    await supabase
      .from("conversations")
      .insert({
        course_id: courseId,
        student_id: user.id,
        teacher_id: teacherId,
      })
      .select()
      .single();

  if (error) {
    throw new Error(error.message);
  }

  return conversation;
}


export async function getUserConversations() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } =
    await supabase
      .from("conversations")
      .select(`
        id,
        course_id,
        student_id,
        teacher_id,
        updated_at,
        courses (
          id,
          title
        )
      `)
      .order(
        "updated_at",
        {
          ascending: false,
        }
      );

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}


export async function getConversationMessages(
  conversationId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } =
    await supabase
      .from("messages")
      .select("*")
      .eq(
        "conversation_id",
        conversationId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}


export async function sendMessage(
  conversationId: string,
  text: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const message = text.trim();

  if (!message) {
    throw new Error("Message cannot be empty");
  }

  const { data, error } =
    await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message,
      })
      .select()
      .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/teacher/messages");
  revalidatePath("/my-courses");

  return data;
}


export async function markMessagesAsRead(
  conversationId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } =
    await supabase
      .from("messages")
      .update({
        is_read: true,
      })
      .eq(
        "conversation_id",
        conversationId
      )
      .neq(
        "sender_id",
        user.id
      );

  if (error) {
    throw new Error(error.message);
  }
}
