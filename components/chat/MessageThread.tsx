"use client";

import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  deleteMessage,
  editMessage,
  markConversationRead,
  sendMessage,
} from "@/app/actions/chat";

import type {
  ChatMessage,
} from "@/lib/chat";

import {
  useLanguage,
} from "@/components/LanguageProvider";

import ActionToast from "@/components/ui/ActionToast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type TeacherProfile = {
  image_url:
    | string
    | null;
};

type UserInfo = {
  full_name:
    | string
    | null;

  avatar_url:
    | string
    | null;

  teacher_profiles?:
    | TeacherProfile[]
    | null;
};

interface Props {
  conversationId: string;

  initialMessages:
    ChatMessage[];

  currentUserId: string;

  conversation: {
    student_id: string;
    teacher_id: string;

    course?:
      | {
          title:
            | string
            | null;
        }[]
      | null;

    student?:
      | UserInfo[]
      | null;

    teacher?:
      | UserInfo[]
      | null;
  };

  readOnly?: boolean;
}

type ToastState = {
  message: string;
  type:
    | "success"
    | "error";
} | null;

function BackIcon({
  rtl,
}: {
  rtl: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-5 w-5 ${
        rtl
          ? "rotate-180"
          : ""
      }`}
    >
      <path
        d="m15 18-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="m9.5 12.5 5.8-5.8a3 3 0 0 1 4.2 4.2l-7.9 7.9a5 5 0 0 1-7.1-7.1l8.2-8.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon({
  rtl,
}: {
  rtl: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-5 w-5 ${
        rtl
          ? "rotate-180"
          : ""
      }`}
    >
      <path
        d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M7 3h7l4 4v14H7V3Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M14 3v5h5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
  conversation,
  readOnly = false,
}: Props) {
  const {
    language,
  } =
    useLanguage();

  const isArabic =
    language === "ar";

  const [
    messages,
    setMessages,
  ] =
    useState<
      ChatMessage[]
    >(
      initialMessages
    );

  const [
    draft,
    setDraft,
  ] =
    useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    editingText,
    setEditingText,
  ] =
    useState("");

  const [
    otherOnline,
    setOtherOnline,
  ] =
    useState(false);

  const [
    isTyping,
    setIsTyping,
  ] =
    useState(false);

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<
      string | null
    >(null);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const [
    toast,
    setToast,
  ] =
    useState<ToastState>(
      null
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const bottomRef =
    useRef<HTMLDivElement>(
      null
    );

  const student =
    conversation.student?.[0] ??
    null;

  const teacher =
    conversation.teacher?.[0] ??
    null;

  const currentIsStudent =
    conversation.student_id ===
    currentUserId;

  const currentIsTeacher =
    conversation.teacher_id ===
    currentUserId;

  const teacherAvatar =
    teacher
      ?.teacher_profiles?.[0]
      ?.image_url ??
    teacher?.avatar_url ??
    null;

  const otherUser =
    currentIsStudent
      ? teacher
      : student;

  const otherAvatar =
    currentIsStudent
      ? teacherAvatar
      : student?.avatar_url ??
        null;

  const otherName =
    readOnly &&
    !currentIsStudent &&
    !currentIsTeacher
      ? `${
          student
            ?.full_name ??
          (isArabic
            ? "طالب"
            : "Student")
        } ↔ ${
          teacher
            ?.full_name ??
          (isArabic
            ? "مدرس"
            : "Instructor")
        }`
      : otherUser
          ?.full_name ??
        (
          currentIsStudent
            ? isArabic
              ? "المدرس"
              : "Instructor"
            : isArabic
              ? "الطالب"
              : "Student"
        );

  const courseTitle =
    conversation.course?.[0]
      ?.title ??
    "";

  function initials(
    name: string
  ) {
    const parts =
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (
      parts.length === 0
    ) {
      return "?";
    }

    return parts
      .slice(0, 2)
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .toUpperCase();
  }

  function formatTime(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleTimeString(
      isArabic
        ? "ar-JO"
        : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function dateKey(
    value: string
  ) {
    const date =
      new Date(value);

    return [
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ].join("-");
  }

  function formatDay(
    value: string
  ) {
    const date =
      new Date(value);

    const today =
      new Date();

    if (
      dateKey(
        value
      ) ===
      dateKey(
        today.toISOString()
      )
    ) {
      return isArabic
        ? "اليوم"
        : "Today";
    }

    const yesterday =
      new Date();

    yesterday.setDate(
      yesterday.getDate() -
        1
    );

    if (
      dateKey(
        value
      ) ===
      dateKey(
        yesterday.toISOString()
      )
    ) {
      return isArabic
        ? "أمس"
        : "Yesterday";
    }

    return date.toLocaleDateString(
      isArabic
        ? "ar-JO"
        : "en-US",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  function fileSize(
    bytes:
      | number
      | null
  ) {
    if (!bytes) {
      return "";
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes /
        1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (
        1024 *
        1024
      )
    ).toFixed(1)} MB`;
  }

  useEffect(() => {
    bottomRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [
    messages.length,
  ]);

  useEffect(() => {
    if (!readOnly) {
      void markConversationRead(
        conversationId
      );
    }
  }, [
    conversationId,
    readOnly,
  ]);

  async function updatePresence() {
    if (readOnly) {
      return;
    }

    const supabase =
      createClient();

    await supabase
      .from(
        "user_presence"
      )
      .upsert({
        user_id:
          currentUserId,

        last_seen:
          new Date()
            .toISOString(),
      });
  }

  async function checkOtherPresence() {
    const supabase =
      createClient();

    const otherId =
      conversation.student_id ===
      currentUserId
        ? conversation.teacher_id
        : conversation.student_id;

    const {
      data,
      error,
    } = await supabase
      .from(
        "user_presence"
      )
      .select(
        "last_seen"
      )
      .eq(
        "user_id",
        otherId
      )
      .maybeSingle();

    if (
      error ||
      !data?.last_seen
    ) {
      setOtherOnline(
        false
      );

      return;
    }

    const diff =
      Date.now() -
      new Date(
        data.last_seen
      ).getTime();

    /*
     * Global heartbeat runs every 30 seconds.
     * Consider online for 90 seconds.
     */
    setOtherOnline(
      diff < 90000
    );
  }


  async function refreshMessages() {
    const supabase =
      createClient();

    const {
      data,
    } =
      await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          read_at,
          message_type,
          attachment_url,
          attachment_name,
          attachment_size,
          edited_at,
          deleted_at
        `)
        .eq(
          "conversation_id",
          conversationId
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (data) {
      setMessages(
        data as ChatMessage[]
      );
    }
  }

  useEffect(() => {
    let mounted =
      true;

    async function syncPresence() {
      await updatePresence();

      if (!mounted) {
        return;
      }

      await checkOtherPresence();
    }

    void syncPresence();

    const timer =
      window.setInterval(
        () => {
          void syncPresence();
        },
        30000
      );

    return () => {
      mounted = false;

      window.clearInterval(
        timer
      );
    };
  }, [
    currentUserId,
    conversation.student_id,
    conversation.teacher_id,
    readOnly,
  ]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `messages-${conversationId}`
        )
        .on(
          "broadcast",
          {
            event: "typing",
          },
          (
            payload
          ) => {
            if (
              payload
                .payload
                .user_id !==
              currentUserId
            ) {
              setIsTyping(
                Boolean(
                  payload
                    .payload
                    .typing
                )
              );

              if (
                payload
                  .payload
                  .typing
              ) {
                window.setTimeout(
                  () => {
                    setIsTyping(
                      false
                    );
                  },
                  2000
                );
              }
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "messages",
          },
          async (
            payload
          ) => {
            const changed =
              payload.new as
                Partial<ChatMessage>;

            if (
              changed.conversation_id &&
              changed.conversation_id !==
                conversationId
            ) {
              return;
            }

            await refreshMessages();

            if (
              !readOnly &&
              changed.sender_id &&
              changed.sender_id !==
                currentUserId
            ) {
              void markConversationRead(
                conversationId
              );
            }
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    conversationId,
    currentUserId,
    readOnly,
  ]);

  function handleTyping(
    value: string
  ) {
    setDraft(value);

    const supabase =
      createClient();

    void supabase
      .channel(
        `messages-${conversationId}`
      )
      .send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id:
            currentUserId,

          typing:
            value
              .trim()
              .length >
            0,
        },
      });
  }

  async function uploadFile(
    file: File
  ) {
    const supabase =
      createClient();

    if (
      file.size >
      10 *
        1024 *
        1024
    ) {
      throw new Error(
        isArabic
          ? "الحد الأقصى لحجم الملف هو 10MB."
          : "Maximum file size is 10MB."
      );
    }

    const filePath =
      `${conversationId}/${crypto.randomUUID()}-${file.name}`;

    const {
      error,
    } =
      await supabase.storage
        .from(
          "chat-files"
        )
        .upload(
          filePath,
          file
        );

    if (error) {
      throw error;
    }

    const {
      data,
      error:
        signedError,
    } =
      await supabase.storage
        .from(
          "chat-files"
        )
        .createSignedUrl(
          filePath,
          60 * 60
        );

    if (
      signedError
    ) {
      throw signedError;
    }

    return {
      url:
        data.signedUrl,

      name:
        file.name,

      size:
        file.size,

      type:
        file.type.startsWith(
          "image/"
        )
          ? "image" as const
          : "file" as const,
    };
  }

  function handleSend(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const content =
      draft.trim();

    if (
      !content &&
      !selectedFile
    ) {
      return;
    }

    setDraft("");

    startTransition(
      async () => {
        try {
          let attachment;

          if (
            selectedFile
          ) {
            attachment =
              await uploadFile(
                selectedFile
              );
          }

          await sendMessage(
            conversationId,
            content,
            attachment
          );

          setSelectedFile(
            null
          );

          await refreshMessages();
        } catch (error) {
          setDraft(
            content
          );

          setToast({
            type: "error",

            message:
              error instanceof
              Error
                ? error.message
                : isArabic
                  ? "تعذر إرسال الرسالة."
                  : "Unable to send message.",
          });
        }
      }
    );
  }

  async function saveEdit(
    messageId: string
  ) {
    if (
      !editingText.trim()
    ) {
      return;
    }

    try {
      await editMessage(
        messageId,
        editingText
      );

      setEditingId(
        null
      );

      setEditingText(
        ""
      );

      await refreshMessages();

      setToast({
        type: "success",
        message:
          isArabic
            ? "تم تعديل الرسالة."
            : "Message edited.",
      });
    } catch (error) {
      setToast({
        type: "error",

        message:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تعديل الرسالة."
              : "Unable to edit message.",
      });
    }
  }

  async function confirmDelete() {
    if (
      !deleteTarget
    ) {
      return;
    }

    try {
      setDeleting(
        true
      );

      await deleteMessage(
        deleteTarget
      );

      setDeleteTarget(
        null
      );

      await refreshMessages();

      setToast({
        type: "success",

        message:
          isArabic
            ? "تم حذف الرسالة."
            : "Message deleted.",
      });
    } catch (error) {
      setToast({
        type: "error",

        message:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر حذف الرسالة."
              : "Unable to delete message.",
      });
    } finally {
      setDeleting(
        false
      );
    }
  }

  return (
    <>
      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-[var(--brand-surface)] shadow-sm"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <header className="flex shrink-0 items-center gap-3 border-b bg-[var(--brand-surface)] px-4 py-3 sm:px-5 sm:py-4">
          <Link
            href="/messages"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[var(--brand-text-muted)] transition hover:bg-[var(--brand-bg)] hover:text-[var(--brand-text)]"
            aria-label={
              isArabic
                ? "العودة"
                : "Back"
            }
          >
            <BackIcon
              rtl={
                isArabic
              }
            />
          </Link>

          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border bg-[var(--brand-bg)] font-black text-[#087a54] sm:h-14 sm:w-14">
              {otherAvatar ? (
                <img
                  src={
                    otherAvatar
                  }
                  alt={
                    otherName
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(
                  otherName
                )
              )}
            </div>

            {!readOnly && (
              <span
                className={`absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--brand-surface)] ${
                  otherOnline
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                }`}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-black text-[var(--brand-text)] sm:text-lg">
                {otherName}
              </h1>

              {readOnly && (
                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600">
                  {isArabic
                    ? "عرض فقط"
                    : "Read only"}
                </span>
              )}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {!readOnly && (
                <span
                  className={
                    isTyping
                      ? "font-semibold text-[#087a54]"
                      : otherOnline
                        ? "text-emerald-600"
                        : "text-[var(--brand-text-muted)]"
                  }
                >
                  {isTyping
                    ? isArabic
                      ? "يكتب الآن..."
                      : "Typing..."
                    : otherOnline
                      ? isArabic
                        ? "متصل الآن"
                        : "Online"
                      : isArabic
                        ? "غير متصل"
                        : "Offline"}
                </span>
              )}

              {courseTitle && (
                <>
                  {!readOnly && (
                    <span className="text-[var(--brand-text-muted)]">
                      •
                    </span>
                  )}

                  <span className="truncate text-[var(--brand-text-muted)]">
                    {courseTitle}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto bg-[var(--brand-bg)]/35 px-3 py-5 sm:px-6"
          dir="ltr"
        >
          {messages.length ===
          0 ? (
            <div
              className="flex h-full min-h-[260px] flex-col items-center justify-center text-center"
              dir={
                isArabic
                  ? "rtl"
                  : "ltr"
              }
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-surface)] text-2xl">
                💬
              </div>

              <h2 className="mt-4 font-black text-[var(--brand-text)]">
                {isArabic
                  ? "ابدأ المحادثة"
                  : "Start the conversation"}
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--brand-text-muted)]">
                {isArabic
                  ? "أرسل أول رسالة لبدء التواصل."
                  : "Send the first message to start chatting."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(
                (
                  message,
                  index
                ) => {
                  const isOwn =
                    message.sender_id ===
                    currentUserId;

                  const previous =
                    messages[
                      index -
                        1
                    ];

                  const showDate =
                    !previous ||
                    dateKey(
                      previous.created_at
                    ) !==
                      dateKey(
                        message.created_at
                      );

                  return (
                    <div
                      key={
                        message.id
                      }
                    >
                      {showDate && (
                        <div className="my-5 flex items-center justify-center">
                          <span
                            className="rounded-full border bg-[var(--brand-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--brand-text-muted)] shadow-sm"
                            dir={
                              isArabic
                                ? "rtl"
                                : "ltr"
                            }
                          >
                            {formatDay(
                              message.created_at
                            )}
                          </span>
                        </div>
                      )}

                      <div
                        className={`group flex ${
                          isOwn
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
                            isOwn
                              ? "rounded-br-md bg-[#087a54] text-white"
                              : "rounded-bl-md border bg-[var(--brand-surface)] text-[var(--brand-text)]"
                          }`}
                          dir={
                            isArabic
                              ? "rtl"
                              : "ltr"
                          }
                        >
                          {message.deleted_at ? (
                            <p
                              className={`text-sm italic ${
                                isOwn
                                  ? "text-white/70"
                                  : "text-[var(--brand-text-muted)]"
                              }`}
                            >
                              {isArabic
                                ? "تم حذف هذه الرسالة"
                                : "This message was deleted"}
                            </p>
                          ) : (
                            <>
                              {editingId ===
                              message.id ? (
                                <div className="min-w-[260px] space-y-3">
                                  <textarea
                                    value={
                                      editingText
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      setEditingText(
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    rows={
                                      3
                                    }
                                    className="w-full resize-none rounded-xl border bg-white p-3 text-sm text-slate-900 outline-none"
                                  />

                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingId(
                                          null
                                        );

                                        setEditingText(
                                          ""
                                        );
                                      }}
                                      className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold"
                                    >
                                      {isArabic
                                        ? "إلغاء"
                                        : "Cancel"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void saveEdit(
                                          message.id
                                        )
                                      }
                                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#087a54]"
                                    >
                                      {isArabic
                                        ? "حفظ"
                                        : "Save"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {message.content &&
                                    message.content.trim() && (
                                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                        {
                                          message.content
                                        }
                                      </p>
                                    )}
                                </>
                              )}

                              {message.attachment_url &&
                                message.message_type ===
                                  "image" && (
                                  <a
                                    href={
                                      message.attachment_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <img
                                      src={
                                        message.attachment_url
                                      }
                                      alt={
                                        message.attachment_name ??
                                        ""
                                      }
                                      className="mt-2 max-h-72 max-w-full rounded-xl object-cover"
                                    />
                                  </a>
                                )}

                              {message.attachment_url &&
                                message.message_type ===
                                  "file" && (
                                  <a
                                    href={
                                      message.attachment_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`mt-2 flex items-center gap-3 rounded-xl p-3 ${
                                      isOwn
                                        ? "bg-white/10"
                                        : "bg-[var(--brand-bg)]"
                                    }`}
                                  >
                                    <FileIcon />

                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-bold">
                                        {message.attachment_name ??
                                          (isArabic
                                            ? "ملف"
                                            : "File")}
                                      </p>

                                      <p
                                        className={`mt-0.5 text-[10px] ${
                                          isOwn
                                            ? "text-white/60"
                                            : "text-[var(--brand-text-muted)]"
                                        }`}
                                      >
                                        {fileSize(
                                          message.attachment_size
                                        )}
                                      </p>
                                    </div>
                                  </a>
                                )}
                            </>
                          )}

                          <div className="mt-2 flex items-center justify-end gap-2">
                            {message.edited_at &&
                              !message.deleted_at && (
                                <span
                                  className={`text-[10px] ${
                                    isOwn
                                      ? "text-white/60"
                                      : "text-[var(--brand-text-muted)]"
                                  }`}
                                >
                                  {isArabic
                                    ? "معدلة"
                                    : "edited"}
                                </span>
                              )}

                            <span
                              className={`text-[10px] ${
                                isOwn
                                  ? "text-white/70"
                                  : "text-[var(--brand-text-muted)]"
                              }`}
                            >
                              {formatTime(
                                message.created_at
                              )}
                            </span>
                          </div>

                          {isOwn &&
                            !message.deleted_at &&
                            editingId !==
                              message.id && (
                              <div className="mt-2 hidden justify-end gap-3 border-t border-white/10 pt-2 group-hover:flex">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(
                                      message.id
                                    );

                                    setEditingText(
                                      message.content
                                    );
                                  }}
                                  className="text-[11px] font-semibold text-white/75 transition hover:text-white"
                                >
                                  {isArabic
                                    ? "تعديل"
                                    : "Edit"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget(
                                      message.id
                                    )
                                  }
                                  className="text-[11px] font-semibold text-white/75 transition hover:text-white"
                                >
                                  {isArabic
                                    ? "حذف"
                                    : "Delete"}
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}

              {isTyping &&
                !readOnly && (
                  <div className="flex justify-start pt-2">
                    <div
                      className="rounded-2xl rounded-bl-md border bg-[var(--brand-surface)] px-4 py-3 text-xs text-[var(--brand-text-muted)] shadow-sm"
                      dir={
                        isArabic
                          ? "rtl"
                          : "ltr"
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#087a54]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#087a54]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#087a54]" />

                        <span className="ms-1">
                          {isArabic
                            ? "يكتب..."
                            : "Typing..."}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

              <div
                ref={
                  bottomRef
                }
              />
            </div>
          )}
        </div>

        {readOnly ? (
          <div className="shrink-0 border-t bg-[var(--brand-surface)] p-4 text-center text-sm text-[var(--brand-text-muted)]">
            {isArabic
              ? "عرض فقط — الأدمن لا يمكنه إرسال رسائل في هذه المحادثة."
              : "Read only — admins cannot send messages in this conversation."}
          </div>
        ) : (
          <form
            onSubmit={
              handleSend
            }
            className="shrink-0 border-t bg-[var(--brand-surface)] p-3 sm:p-4"
          >
            {selectedFile && (
              <div className="mb-3 flex items-center gap-3 rounded-2xl border bg-[var(--brand-bg)] p-3">
                {selectedFile.type.startsWith(
                  "image/"
                ) ? (
                  <img
                    src={
                      URL.createObjectURL(
                        selectedFile
                      )
                    }
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-surface)] text-[#087a54]">
                    <FileIcon />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--brand-text)]">
                    {
                      selectedFile.name
                    }
                  </p>

                  <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">
                    {fileSize(
                      selectedFile.size
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedFile(
                      null
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-red-500 transition hover:bg-red-500/10"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border text-[var(--brand-text-muted)] transition hover:bg-[var(--brand-bg)] hover:text-[#087a54]">
                <PaperclipIcon />

                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.zip"
                  onChange={(
                    event
                  ) =>
                    setSelectedFile(
                      event.target
                        .files?.[0] ??
                        null
                    )
                  }
                />
              </label>

              <div className="min-w-0 flex-1">
                <textarea
                  value={
                    draft
                  }
                  onChange={(
                    event
                  ) =>
                    handleTyping(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      event.currentTarget
                        .form
                        ?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={
                    4000
                  }
                  placeholder={
                    isArabic
                      ? "اكتب رسالتك..."
                      : "Write a message..."
                  }
                  className="max-h-32 min-h-11 w-full resize-none rounded-2xl border bg-[var(--brand-bg)] px-4 py-3 text-sm text-[var(--brand-text)] outline-none transition placeholder:text-[var(--brand-text-muted)] focus:border-[#087a54] focus:ring-2 focus:ring-[#087a54]/10"
                />
              </div>

              <button
                type="submit"
                disabled={
                  isPending ||
                  (
                    !draft.trim() &&
                    !selectedFile
                  )
                }
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#087a54] px-4 font-bold text-white transition hover:bg-[#066846] disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
              >
                <span className="hidden sm:inline">
                  {isPending
                    ? isArabic
                      ? "إرسال..."
                      : "Sending..."
                    : isArabic
                      ? "إرسال"
                      : "Send"}
                </span>

                <SendIcon
                  rtl={
                    isArabic
                  }
                />
              </button>
            </div>

            <p className="mt-2 px-1 text-[10px] text-[var(--brand-text-muted)]">
              {isArabic
                ? "Enter للإرسال • Shift + Enter لسطر جديد"
                : "Enter to send • Shift + Enter for a new line"}
            </p>
          </form>
        )}
      </section>

      <ConfirmDialog
        open={
          deleteTarget !==
          null
        }
        title={
          isArabic
            ? "حذف الرسالة؟"
            : "Delete message?"
        }
        description={
          isArabic
            ? "ستظهر الرسالة للطرفين على أنها محذوفة."
            : "The message will appear as deleted for both participants."
        }
        confirmText={
          isArabic
            ? "حذف الرسالة"
            : "Delete message"
        }
        cancelText={
          isArabic
            ? "إلغاء"
            : "Cancel"
        }
        tone="danger"
        busy={
          deleting
        }
        onCancel={() =>
          setDeleteTarget(
            null
          )
        }
        onConfirm={
          confirmDelete
        }
      />

      <ActionToast
        message={
          toast?.message ??
          null
        }
        type={
          toast?.type
        }
        onClose={() =>
          setToast(
            null
          )
        }
      />
    </>
  );
}
