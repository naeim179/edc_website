"use client";

import Link from "next/link";
import { subscribeChat } from "@/lib/chat-realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CHAT_FILE_ACCEPT, validChatFile } from "@/lib/chat-attachments";

import {
  useCallback,
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
  getConversationMessages,
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

  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef(0);
  const refreshSequence = useRef(0);
  const sendLock = useRef(false);
  const editLock = useRef(false);
  const deleteLock = useRef(false);
  const messageIdsRef = useRef(new Set(initialMessages.map(message => message.id)));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);
  useEffect(() => { messageIdsRef.current = new Set(messages.map(message => message.id)); }, [messages]);

  const threadRef = useRef<HTMLElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

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

  // Keep the composer above navigation and the on-screen keyboard, even when
  // translated toolbar text wraps onto another line.
  useEffect(() => {
    const thread = threadRef.current;
    const wrapper = thread?.parentElement;
    if (!wrapper) return;
    const topbar = document.querySelector(".yw-topbar-wrap");
    const navigation = document.querySelector(".yw-mobile-nav");
    const viewport = window.visualViewport;
    const composer = thread?.querySelector(":scope > form");
    const chatHeader = thread?.querySelector(":scope > header");
    let headerHeight = chatHeader?.getBoundingClientRect().height || 80;
    let composerHeight = composer?.getBoundingClientRect().height ?? 0;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
        const navRect = navigation?.getBoundingClientRect();
        const boundary = navRect && navRect.height > 0 ? Math.min(viewportBottom, navRect.top) : viewportBottom;
        const top = Math.max(viewportTop, wrapper.getBoundingClientRect().top);
        const height = Math.max(0, boundary - top - 12);
        wrapper.style.setProperty("--chat-height", `${height}px`);
        const visibleHeaderHeight = chatHeader?.getBoundingClientRect().height ?? 0;
        if (visibleHeaderHeight > 0) headerHeight = visibleHeaderHeight;
        if (!thread?.hasAttribute("data-compact-chat")) composerHeight = composer?.getBoundingClientRect().height ?? 0;
        thread?.toggleAttribute("data-compact-chat", height < headerHeight + composerHeight + 60);
      });
    };
    const observer = new ResizeObserver(fit);
    if (topbar) observer.observe(topbar);
    if (navigation) observer.observe(navigation);
    if (composer) observer.observe(composer);
    window.addEventListener("resize", fit);
    viewport?.addEventListener("resize", fit);
    viewport?.addEventListener("scroll", fit);
    fit();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("resize", fit);
      viewport?.removeEventListener("resize", fit);
      viewport?.removeEventListener("scroll", fit);
      wrapper.style.removeProperty("--chat-height");
      thread?.removeAttribute("data-compact-chat");
    };
  }, [isArabic, selectedFile]);

  useEffect(() => {
    const container = messageScrollRef.current;
    if (container && shouldAutoScroll.current) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!readOnly && document.visibilityState === "visible") {
      void markConversationRead(conversationId).catch(() => {});
    }
  }, [
    conversationId,
    readOnly,
  ]);

  const updatePresence = useCallback(async () => {
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
  }, [currentUserId, readOnly]);

  const checkOtherPresence = useCallback(async () => {
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
  }, [conversation.student_id, conversation.teacher_id, currentUserId]);


  const refreshMessages = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const data = await getConversationMessages(conversationId);
    if (sequence === refreshSequence.current) setMessages(data);
  }, [conversationId]);

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      void refreshMessages().then(() => {
        if (!readOnly) return markConversationRead(conversationId);
      }).catch(() => setToast({ type: "error", message: isArabic ? "تعذر تحديث الرسائل. أعد المحاولة عند عودة الاتصال." : "Unable to refresh messages. Retry when your connection returns." }));
    };
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    const timer = window.setInterval(sync, 30000);
    return () => {
      window.removeEventListener("focus", sync); window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", sync); window.clearInterval(timer);
    };
  }, [refreshMessages, conversationId, readOnly, isArabic]);

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
    updatePresence,
    checkOtherPresence,
  ]);

  useEffect(() => {
    const supabase = createClient();
    const otherId = currentUserId === conversation.student_id ? conversation.teacher_id : conversation.student_id;
    const sync = () => refreshMessages().catch(() => {});
    const channel = supabase.channel(`messages-${conversationId}`, { config: { private: true } })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (readOnly || payload?.user_id !== otherId) return;
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        setIsTyping(Boolean(payload.typing));
        if (payload.typing) typingTimerRef.current = setTimeout(() => setIsTyping(false), 2500);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, async payload => {
        await sync();
        const changed = payload.new as Partial<ChatMessage>;
        if (!readOnly && payload.eventType === "INSERT" && changed.sender_id !== currentUserId && document.visibilityState === "visible") {
          void markConversationRead(conversationId).catch(() => {});
        }
      })
      // Supabase cannot filter DELETE events. Only refresh when a known row disappears.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, payload => {
        if (messageIdsRef.current.has(payload.old.id)) void sync();
      })
      ;
    const dispose = subscribeChat(supabase, channel, status => { setLiveConnected(status === "SUBSCRIBED"); if (status === "SUBSCRIBED") void sync(); });
    channelRef.current = channel;
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      channelRef.current = null;
      dispose();
    };
  }, [conversationId, currentUserId, readOnly, refreshMessages, conversation.student_id, conversation.teacher_id]);

  function sendTyping(typing: boolean) {
    if (readOnly || !channelRef.current || channelRef.current.state !== "joined") return;
    if (typing && Date.now() - lastTypingRef.current < 600) return;
    lastTypingRef.current = Date.now();
    void channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: currentUserId, typing } });
  }

  function handleTyping(value: string) { setDraft(value); sendTyping(Boolean(value.trim())); }

  function chooseFile(file: File | null) {
    if (file && !validChatFile(file.name, file.size)) {
      setToast({ type: "error", message: isArabic ? "اختر صورة أو PDF أو Word أو ZIP بحجم بين 1 بايت و10MB." : "Choose an image, PDF, Word or ZIP file between 1 byte and 10MB." });
      return;
    }
    setSelectedFile(file);
    setFilePreview(file?.type.startsWith("image/") ? URL.createObjectURL(file) : null);
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

    if (!validChatFile(file.name, file.size)) throw new Error(isArabic ? "نوع الملف أو حجمه غير مدعوم" : "Unsupported file type or size");
    const extension = file.name.split(".").pop()!.toLowerCase();
    const filePath = `${conversationId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("chat-files").upload(filePath, file);
    if (error) throw error;
    return {
      url:
        filePath,

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

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    const file = selectedFile;
    if (readOnly || sendLock.current || (!content && !file)) return;
    sendLock.current = true;
    shouldAutoScroll.current = true;
    startTransition(async () => {
      let uploadedPath: string | null = null;
      let sent = false;
      try {
        const attachment = file ? await uploadFile(file) : undefined;
        uploadedPath = attachment?.url ?? null;
        await sendMessage(conversationId, content, attachment);
        sent = true;
        setDraft(""); chooseFile(null); sendTyping(false);
        await refreshMessages();
      } catch (error) {
        if (uploadedPath && !sent) await createClient().storage.from("chat-files").remove([uploadedPath]);
        setToast({ type: "error", message: sent ? (isArabic ? "تم الإرسال، لكن تعذر تحديث العرض. أعد فتح المحادثة." : "Sent, but the view could not refresh. Reopen the conversation.") : error instanceof Error ? error.message : isArabic ? "تعذر إرسال الرسالة." : "Unable to send message." });
      } finally { sendLock.current = false; }
    });
  }

  async function saveEdit(
    messageId: string
  ) {
    if (readOnly || editLock.current || !editingText.trim()) {
      return;
    }

    editLock.current = true;
    setSavingEdit(true);
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

      setMessages(previous => previous.map(message => message.id === messageId ? { ...message, content: editingText.trim(), edited_at: new Date().toISOString() } : message));
      void refreshMessages().catch(() => {});

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
    } finally { editLock.current = false; setSavingEdit(false); }
  }

  async function confirmDelete() {
    if (
      !deleteTarget || deleteLock.current || readOnly
    ) {
      return;
    }

    deleteLock.current = true;
    try {
      setDeleting(
        true
      );

      await deleteMessage(
        deleteTarget
      );

      setMessages(previous => previous.map(message => message.id === deleteTarget ? { ...message, content: "", deleted_at: new Date().toISOString(), attachment_url: null, attachment_name: null, attachment_size: null } : message));
      setDeleteTarget(null);
      void refreshMessages().catch(() => {});

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
      deleteLock.current = false;
      setDeleting(
        false
      );
    }
  }

  return (
    <>
      <section
        ref={threadRef}
        className="yw-chat-thread flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-[var(--brand-surface)] shadow-sm"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <header className="flex shrink-0 items-center gap-3 border-b bg-[var(--brand-surface)] px-4 py-3 sm:px-5 sm:py-4">
          <Link
            href={readOnly ? "/admin/messages" : "/messages"}
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
                  {!liveConnected ? (isArabic ? "جارٍ الاتصال..." : "Connecting...") : isTyping
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
          ref={messageScrollRef}
          onScroll={event => { const container = event.currentTarget; shouldAutoScroll.current = container.scrollHeight - container.scrollTop - container.clientHeight < 120; }}
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
                          className={`min-w-0 max-w-[86%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
                            isOwn
                              ? "yw-chat-own rounded-br-md bg-[var(--brand-ink)] text-[var(--brand-on-ink)]"
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
                                  ? "text-[var(--brand-on-ink)] opacity-75"
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
                                <div className="w-60 max-w-[min(240px,calc(100vw-8rem))] min-w-0 space-y-3">
                                  <textarea
                                    disabled={savingEdit}
                                    aria-label={isArabic ? "تعديل الرسالة" : "Edit message"}
                                    maxLength={4000}
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
                                      disabled={savingEdit}
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
                                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6">
                                        {
                                          message.content
                                        }
                                      </p>
                                    )}
                                </>
                              )}

                              {message.message_type !== "text" && !message.attachment_url && <p className="mt-2 text-xs">{isArabic ? "المرفق غير متاح. أعد فتح المحادثة للمحاولة مجددًا." : "Attachment unavailable. Reopen the conversation to retry."}</p>}

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
                                            ? "text-[var(--brand-on-ink)] opacity-70"
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
                            {isOwn && !message.deleted_at && (
                              <span className="text-[10px] text-[var(--brand-on-ink)]" aria-label={message.read_at ? (isArabic ? "تمت القراءة" : "Read") : (isArabic ? "تم الإرسال" : "Sent")} title={message.read_at ? (isArabic ? "تمت القراءة" : "Read") : (isArabic ? "تم الإرسال" : "Sent")}>{message.read_at ? "✓✓" : "✓"}</span>
                            )}
                            {message.edited_at &&
                              !message.deleted_at && (
                                <span
                                  className={`text-[10px] ${
                                    isOwn
                                      ? "text-[var(--brand-on-ink)] opacity-70"
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
                                  ? "text-[var(--brand-on-ink)] opacity-75"
                                  : "text-[var(--brand-text-muted)]"
                              }`}
                            >
                              {formatTime(
                                message.created_at
                              )}
                            </span>
                          </div>

                          {isOwn && !readOnly &&
                            !message.deleted_at &&
                            editingId !==
                              message.id && (
                              <div className="mt-2 flex justify-end gap-3 border-t border-current/15 pt-2">
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
                                  className="min-h-8 rounded px-1 text-xs font-semibold text-[var(--brand-on-ink)] transition hover:underline"
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
                                  className="min-h-8 rounded px-1 text-xs font-semibold text-[var(--brand-on-ink)] transition hover:underline"
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
              <div className="yw-chat-attachment-preview mb-3 flex items-center gap-3 rounded-2xl border bg-[var(--brand-bg)] p-3">
                {selectedFile.type.startsWith(
                  "image/"
                ) ? (
                  <img
                    src={
                      filePreview ?? undefined
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
                    chooseFile(null)
                  }
                  aria-label={isArabic ? "إزالة المرفق" : "Remove attachment"}
                  disabled={isPending}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-red-500 transition hover:bg-red-500/10"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <button type="button" disabled={isPending} aria-label={isArabic ? "إرفاق ملف" : "Attach file"} onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[var(--brand-text-muted)] transition hover:bg-[var(--brand-bg)]"><PaperclipIcon /></button>
              <input ref={fileInputRef} type="file" className="hidden" accept={CHAT_FILE_ACCEPT} disabled={isPending}
                onChange={event => { chooseFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />

              <div className="min-w-0 flex-1">
                <textarea
                  disabled={isPending}
                  aria-label={isArabic ? "اكتب رسالتك" : "Write a message"}
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
                      !event.shiftKey && !event.nativeEvent.isComposing
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
                aria-label={isArabic ? "إرسال" : "Send"}
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

            <p className="yw-chat-compose-hint mt-2 px-1 text-[10px] text-[var(--brand-text-muted)]">
              {isArabic
                ? "Enter للإرسال • Shift + Enter لسطر جديد"
                : "Enter to send • Shift + Enter for a new line"}
            </p>
            {selectedFile && <div className="yw-chat-compact-file mt-2 hidden min-w-0 items-center gap-2 text-xs text-[var(--brand-text-muted)]">
              <span className="min-w-0 flex-1 truncate">{selectedFile.name}</span>
              <button type="button" disabled={isPending} onClick={() => chooseFile(null)} aria-label={isArabic ? "إزالة المرفق" : "Remove attachment"} className="h-6 w-6 shrink-0 rounded text-red-500">×</button>
            </div>}
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
