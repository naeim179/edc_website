"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/chat";
import { chatAttachmentPath, validChatFile } from "@/lib/chat-attachments";

export async function startConversation(
  courseId: string
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      userError.message
    );
  }

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولاً"
    );
  }


  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (profileError) {
    throw new Error(
      profileError.message
    );
  }

  if (
    profile?.role !==
    "student"
  ) {
    throw new Error(
      "بدء المحادثة متاح للطالب فقط"
    );
  }


  /*
   * The student MUST own / be enrolled in this course.
   */
  const {
    data: enrollment,
    error: enrollmentError,
  } = await supabase
    .from("enrollments")
    .select("id")
    .eq(
      "student_id",
      user.id
    )
    .eq(
      "course_id",
      courseId
    )
    .maybeSingle();

  if (enrollmentError) {
    throw new Error(
      enrollmentError.message
    );
  }

  if (!enrollment) {
    throw new Error(
      "يجب شراء الدورة أو التسجيل فيها أولاً"
    );
  }


  /*
   * NEVER accept teacherId from the browser.
   * The server loads the ONE teacher assigned to this course.
   */
  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from(
      "course_instructors"
    )
    .select(
      "teacher_id"
    )
    .eq(
      "course_id",
      courseId
    )
    .maybeSingle();

  if (assignmentError) {
    throw new Error(
      assignmentError.message
    );
  }

  if (
    !assignment?.teacher_id
  ) {
    throw new Error(
      "لا يوجد مدرس معيّن لهذه الدورة"
    );
  }


  const {
    data: conversationId,
    error,
  } = await supabase.rpc(
    "start_conversation",
    {
      p_course_id:
        courseId,

      p_teacher_id:
        assignment.teacher_id,
    }
  );

  if (error) {
    console.error(
      "startConversation error:",
      error.message
    );

    throw new Error(
      error.message ||
      "تعذر فتح المحادثة"
    );
  }

  revalidatePath(
    "/messages"
  );

  return (
    conversationId as string
  );
}


function refreshChatPaths(conversationId: string) {
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  revalidatePath("/admin/messages");
}

export async function getConversationMessages(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");
  return getMessages(supabase, conversationId);
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachment?: { url: string; name: string; size: number; type: "image" | "file" }
) {
  const trimmed = content.trim();
  if (!trimmed && !attachment) throw new Error("لا يمكن إرسال رسالة فارغة");
  if (trimmed.length > 4000) throw new Error("الرسالة طويلة جدًا");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");
  // Verify membership before touching uploaded files. Administrators remain read-only.
  const { data: conversation, error: conversationError } = await supabase.from("conversations")
    .select("student_id,teacher_id").eq("id", conversationId).maybeSingle();
  if (conversationError || !conversation || ![conversation.student_id, conversation.teacher_id].includes(user.id)) {
    throw new Error("لا يمكنك الإرسال في هذه المحادثة");
  }
  let attachmentPath: string | null = null;
  if (attachment) {
    attachmentPath = chatAttachmentPath(attachment.url, conversationId);
    if (!attachmentPath || !validChatFile(attachment.name, attachment.size) || !["image", "file"].includes(attachment.type)) {
      throw new Error("مرفق غير صالح أو أكبر من 10MB");
    }
    const { data: info, error } = await supabase.storage.from("chat-files").info(attachmentPath);
    if (error || !info || info.size !== attachment.size) throw new Error("تعذر التحقق من المرفق");
  }
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId, sender_id: user.id, content: trimmed || " ",
    message_type: attachment?.type ?? "text", attachment_url: attachmentPath,
    attachment_name: attachment?.name ?? null, attachment_size: attachment?.size ?? null,
  });
  if (error) throw new Error("تعذر إرسال الرسالة");
  refreshChatPaths(conversationId);
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
  if (error) throw new Error("تعذر تحديث حالة قراءة المحادثة");
  revalidatePath("/messages");
}

export async function editMessage(messageId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("الرسالة لا يمكن أن تكون فارغة");
  if (trimmed.length > 4000) throw new Error("الرسالة طويلة جدًا");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول");
  const { data, error } = await supabase.from("messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId).eq("sender_id", user.id).is("deleted_at", null)
    .select("id,conversation_id").maybeSingle();
  if (error || !data) throw new Error("تعذر تعديل الرسالة أو لم تعد متاحة");
  refreshChatPaths(data.conversation_id);
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول");
  const { data: message, error: lookupError } = await supabase.from("messages")
    .select("conversation_id,attachment_url").eq("id", messageId).eq("sender_id", user.id)
    .is("deleted_at", null).maybeSingle();
  if (lookupError || !message) throw new Error("تعذر حذف الرسالة أو لم تعد متاحة");
  const { data, error } = await supabase.from("messages")
    .update({ deleted_at: new Date().toISOString(), content: "" })
    .eq("id", messageId).eq("sender_id", user.id).is("deleted_at", null)
    .select("id").maybeSingle();
  if (error || !data) throw new Error("تعذر حذف الرسالة أو لم تعد متاحة");
  if (message.attachment_url) {
    const path = chatAttachmentPath(message.attachment_url, message.conversation_id);
    if (path) {
      const { error: removalError } = await supabase.storage.from("chat-files").remove([path]);
      if (removalError) console.error("Chat attachment cleanup failed:", removalError.message);
    }
  }
  refreshChatPaths(message.conversation_id);
}
