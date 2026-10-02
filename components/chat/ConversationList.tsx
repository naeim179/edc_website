"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

import type {
  ConversationListItem,
} from "@/lib/chat";

interface Props {
  initialConversations:
    ConversationListItem[];

  userId: string;

  role:
    | "student"
    | "teacher";
}

type Filter =
  | "all"
  | "unread";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        d="M7 18.5 3.5 21v-5A8.5 8.5 0 1 1 7 18.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 19.5v-14Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M20 5.5A2.5 2.5 0 0 0 17.5 3H14v17a3 3 0 0 1 3-3h.5a2.5 2.5 0 0 1 2.5 2.5v-14Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon({
  rtl,
}: {
  rtl: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-5 w-5 transition-transform duration-200 group-hover:translate-x-1 ${
        rtl
          ? "rotate-180 group-hover:-translate-x-1"
          : ""
      }`}
      aria-hidden="true"
    >
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ConversationList({
  initialConversations,
  userId,
  role,
}: Props) {
  const router =
    useRouter();

  const { language } =
    useLanguage();

  const isArabic =
    language === "ar";

  const [
    conversations,
    setConversations,
  ] =
    useState(
      initialConversations
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<Filter>("all");

  useEffect(() => {
    setConversations(
      initialConversations
    );
  }, [
    initialConversations,
  ]);

  useEffect(() => {
    const supabase =
      createClient();

    const column =
      role === "student"
        ? "student_id"
        : "teacher_id";

    const channel =
      supabase
        .channel(
          `conversations-list-${userId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "conversations",
            filter:
              `${column}=eq.${userId}`,
          },
          (payload) => {
            const updated =
              payload.new as
                Partial<ConversationListItem> & {
                  id?: string;

                  student_unread_count?:
                    number;

                  teacher_unread_count?:
                    number;
                };

            if (!updated.id) {
              return;
            }

            setConversations(
              (previous) => {
                const exists =
                  previous.some(
                    (
                      conversation
                    ) =>
                      conversation.id ===
                      updated.id
                  );

                if (!exists) {
                  router.refresh();
                  return previous;
                }

                return previous
                  .map(
                    (
                      conversation
                    ) => {
                      if (
                        conversation.id !==
                        updated.id
                      ) {
                        return conversation;
                      }

                      return {
                        ...conversation,

                        last_message_at:
                          updated.last_message_at ??
                          conversation.last_message_at,

                        last_message_preview:
                          updated.last_message_preview ??
                          conversation.last_message_preview,

                        unread_count:
                          role ===
                          "student"
                            ? updated.student_unread_count ??
                              conversation.unread_count
                            : updated.teacher_unread_count ??
                              conversation.unread_count,
                      };
                    }
                  )
                  .sort(
                    (a, b) =>
                      new Date(
                        b.last_message_at ??
                          0
                      ).getTime() -
                      new Date(
                        a.last_message_at ??
                          0
                      ).getTime()
                  );
              }
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    userId,
    role,
    router,
  ]);

  const totalUnread =
    useMemo(
      () =>
        conversations.reduce(
          (
            total,
            conversation
          ) =>
            total +
            Math.max(
              0,
              conversation.unread_count
            ),
          0
        ),
      [conversations]
    );

  const filtered =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLocaleLowerCase();

      return conversations.filter(
        (conversation) => {
          if (
            filter === "unread" &&
            conversation.unread_count <=
              0
          ) {
            return false;
          }

          if (!normalized) {
            return true;
          }

          const searchable = [
            conversation.other_party_name,
            conversation.course_title,
            conversation.last_message_preview ??
              "",
          ]
            .join(" ")
            .toLocaleLowerCase();

          return searchable.includes(
            normalized
          );
        }
      );
    }, [
      conversations,
      query,
      filter,
    ]);

  function formatTime(
    value: string | null
  ) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    const now =
      new Date();

    const sameDay =
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth() &&
      date.getDate() ===
        now.getDate();

    if (sameDay) {
      return date.toLocaleTimeString(
        isArabic
          ? "ar-JO"
          : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }

    const yesterday =
      new Date(now);

    yesterday.setDate(
      now.getDate() - 1
    );

    const isYesterday =
      date.getFullYear() ===
        yesterday.getFullYear() &&
      date.getMonth() ===
        yesterday.getMonth() &&
      date.getDate() ===
        yesterday.getDate();

    if (isYesterday) {
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
        month: "short",
      }
    );
  }

  function getInitials(
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
          part.charAt(0)
      )
      .join("")
      .toUpperCase();
  }

  const copy = {
    title:
      isArabic
        ? "الرسائل"
        : "Messages",

    subtitle:
      role === "student"
        ? isArabic
          ? "تابع محادثاتك مع مدرسي دوراتك من مكان واحد."
          : "Keep up with your course instructors in one place."
        : isArabic
          ? "تابع محادثات الطلاب المسجلين في دوراتك."
          : "Keep up with students enrolled in your courses.",

    conversations:
      isArabic
        ? "المحادثات"
        : "Conversations",

    unread:
      isArabic
        ? "غير مقروءة"
        : "Unread",

    search:
      isArabic
        ? "ابحث باسم الشخص، الدورة أو الرسالة..."
        : "Search by person, course or message...",

    all:
      isArabic
        ? "كل المحادثات"
        : "All conversations",

    unreadOnly:
      isArabic
        ? "غير المقروءة"
        : "Unread",

    teacher:
      isArabic
        ? "المدرس"
        : "Instructor",

    student:
      isArabic
        ? "الطالب"
        : "Student",

    noMessages:
      isArabic
        ? "لا توجد رسائل بعد"
        : "No messages yet",

    newConversation:
      isArabic
        ? "محادثة جديدة"
        : "New conversation",

    noConversations:
      isArabic
        ? "لا توجد محادثات حتى الآن"
        : "No conversations yet",

    noConversationsHint:
      isArabic
        ? role === "student"
          ? "عندما تبدأ محادثة مع مدرس ستظهر هنا."
          : "عندما يبدأ طالب محادثة معك ستظهر هنا."
        : role === "student"
          ? "When you start a conversation with an instructor, it will appear here."
          : "When a student starts a conversation with you, it will appear here.",

    noResults:
      isArabic
        ? "لا توجد نتائج مطابقة"
        : "No matching conversations",

    noResultsHint:
      isArabic
        ? "جرّب تغيير كلمات البحث أو الفلتر."
        : "Try changing your search or filter.",

    newMessages:
      isArabic
        ? "رسائل جديدة"
        : "new messages",
  };

  return (
    <div
      className="space-y-6"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <section className="overflow-hidden rounded-3xl border bg-[var(--brand-surface)] shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0b7a58]/10 text-[#087a54]">
              <MessageIcon />
            </div>

            <div>
              <h1 className="text-2xl font-black text-[var(--brand-text)] sm:text-3xl">
                {copy.title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--brand-text-muted)]">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-[var(--brand-bg)] p-4">
              <p className="text-xs font-semibold text-[var(--brand-text-muted)]">
                {
                  copy.conversations
                }
              </p>

              <p className="mt-1 text-2xl font-black text-[var(--brand-text)]">
                {
                  conversations.length
                }
              </p>
            </div>

            <div className="rounded-2xl border bg-[var(--brand-bg)] p-4">
              <p className="text-xs font-semibold text-[var(--brand-text-muted)]">
                {copy.unread}
              </p>

              <p
                className={`mt-1 text-2xl font-black ${
                  totalUnread > 0
                    ? "text-[#087a54]"
                    : "text-[var(--brand-text)]"
                }`}
              >
                {totalUnread}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-[var(--brand-surface)] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span
              className={`absolute top-1/2 -translate-y-1/2 text-[var(--brand-text-muted)] ${
                isArabic
                  ? "right-4"
                  : "left-4"
              }`}
            >
              <SearchIcon />
            </span>

            <input
              type="search"
              value={query}
              onChange={(
                event
              ) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder={
                copy.search
              }
              className={`w-full rounded-2xl border bg-[var(--brand-bg)] py-3.5 text-sm text-[var(--brand-text)] outline-none transition focus:border-[#087a54] focus:ring-2 focus:ring-[#087a54]/10 ${
                isArabic
                  ? "pr-12 pl-4"
                  : "pl-12 pr-4"
              }`}
            />
          </label>

          <div className="flex rounded-2xl border bg-[var(--brand-bg)] p-1">
            <button
              type="button"
              onClick={() =>
                setFilter("all")
              }
              className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition md:flex-none ${
                filter === "all"
                  ? "bg-[#087a54] text-white shadow-sm"
                  : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              }`}
            >
              {copy.all}
            </button>

            <button
              type="button"
              onClick={() =>
                setFilter(
                  "unread"
                )
              }
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition md:flex-none ${
                filter ===
                "unread"
                  ? "bg-[#087a54] text-white shadow-sm"
                  : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              }`}
            >
              {
                copy.unreadOnly
              }

              {totalUnread > 0 && (
                <span
                  className={`flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] ${
                    filter ===
                    "unread"
                      ? "bg-white/20 text-white"
                      : "bg-[#087a54] text-white"
                  }`}
                >
                  {
                    totalUnread
                  }
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-[var(--brand-surface)] shadow-sm">
        {conversations.length ===
        0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand-bg)] text-[#087a54]">
              <MessageIcon />
            </div>

            <h2 className="mt-5 text-xl font-black text-[var(--brand-text)]">
              {
                copy.noConversations
              }
            </h2>

            <p className="mt-2 max-w-md text-sm leading-7 text-[var(--brand-text-muted)]">
              {
                copy.noConversationsHint
              }
            </p>
          </div>
        ) : filtered.length ===
          0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-bg)] text-[var(--brand-text-muted)]">
              <SearchIcon />
            </div>

            <h2 className="mt-4 text-lg font-black text-[var(--brand-text)]">
              {copy.noResults}
            </h2>

            <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
              {
                copy.noResultsHint
              }
            </p>

            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-5 rounded-xl border px-4 py-2 text-sm font-bold text-[var(--brand-text)] transition hover:bg-[var(--brand-bg)]"
            >
              {isArabic
                ? "إظهار الكل"
                : "Show all"}
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(
              (
                conversation
              ) => {
                const hasUnread =
                  conversation.unread_count >
                  0;

                return (
                  <Link
                    key={
                      conversation.id
                    }
                    href={`/messages/${conversation.id}`}
                    className={`group block px-4 py-4 transition sm:px-6 sm:py-5 ${
                      hasUnread
                        ? "bg-[#087a54]/[0.035] hover:bg-[#087a54]/[0.07]"
                        : "hover:bg-[var(--brand-bg)]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border bg-[var(--brand-bg)] sm:h-16 sm:w-16">
                          {conversation.other_party_avatar ? (
                            <img
                              src={
                                conversation.other_party_avatar
                              }
                              alt={
                                conversation.other_party_name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-black text-[#087a54]">
                              {getInitials(
                                conversation.other_party_name
                              )}
                            </span>
                          )}
                        </div>

                        {hasUnread && (
                          <span
                            className={`absolute -top-1 flex min-w-6 items-center justify-center rounded-full border-2 border-[var(--brand-surface)] bg-[#087a54] px-1.5 py-0.5 text-[10px] font-black text-white ${
                              isArabic
                                ? "-left-1"
                                : "-right-1"
                            }`}
                          >
                            {conversation.unread_count >
                            99
                              ? "99+"
                              : conversation.unread_count}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`truncate text-base text-[var(--brand-text)] sm:text-lg ${
                                  hasUnread
                                    ? "font-black"
                                    : "font-bold"
                                }`}
                              >
                                {
                                  conversation.other_party_name
                                }
                              </h3>

                              <span className="rounded-full bg-[var(--brand-bg)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-text-muted)]">
                                {role ===
                                "student"
                                  ? copy.teacher
                                  : copy.student}
                              </span>
                            </div>

                            {conversation.course_title && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#087a54]">
                                <BookIcon />

                                <span className="truncate">
                                  {
                                    conversation.course_title
                                  }
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            {conversation.last_message_at && (
                              <span
                                className={`text-[11px] ${
                                  hasUnread
                                    ? "font-bold text-[#087a54]"
                                    : "text-[var(--brand-text-muted)]"
                                }`}
                              >
                                {formatTime(
                                  conversation.last_message_at
                                )}
                              </span>
                            )}

                            <span className="hidden text-[var(--brand-text-muted)] sm:block">
                              <ArrowIcon
                                rtl={
                                  isArabic
                                }
                              />
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-4">
                          <p
                            className={`min-w-0 flex-1 truncate text-sm ${
                              hasUnread
                                ? "font-semibold text-[var(--brand-text)]"
                                : "text-[var(--brand-text-muted)]"
                            }`}
                          >
                            {conversation.last_message_preview
                              ?.trim()
                              ? conversation.last_message_preview
                              : copy.noMessages}
                          </p>

                          {hasUnread && (
                            <span className="hidden shrink-0 items-center gap-2 rounded-full bg-[#087a54]/10 px-3 py-1 text-[10px] font-bold text-[#087a54] md:flex">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#087a54]" />

                              {
                                copy.newMessages
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}
