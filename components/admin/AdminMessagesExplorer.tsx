"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Conversation = {
  id: string;
  other_party_name: string | null;
  course_title: string | null;
  last_message_preview: string | null;
};

export default function AdminMessagesExplorer({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    if (!query) return conversations;

    return conversations.filter((conv) =>
      [
        conv.other_party_name,
        conv.course_title,
        conv.last_message_preview,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(query)
    );
  }, [conversations, search]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-6xl space-y-6 px-0 pb-10 sm:px-4"
    >
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-l from-[#123F39] via-[#1B4B43] to-[#28665B] p-6 text-white shadow-[0_18px_50px_rgba(27,75,67,0.14)] sm:p-9">
        <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/[0.05]" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold">
              الإدارة / التواصل
            </span>

            <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
              مركز المحادثات
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-8 text-white/75">
              راجع محادثات الطلاب والمدرسين وتابع التواصل داخل المنصة
              من مكان واحد.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-center">
            <p className="text-3xl font-bold">{conversations.length}</p>
            <p className="mt-1 text-xs text-white/75">إجمالي المحادثات</p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E1E8E4] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full flex-1 sm:max-w-xl">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#84938B]"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 5 5" />
            </svg>

            <input
              type="search"
              aria-label="البحث في المحادثات"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisibleCount(12);
              }}
              placeholder="ابحث عن طالب أو مدرس أو دورة..."
              className="w-full rounded-2xl border border-[#DCE5E0] bg-[#FAFCFB] py-3.5 pe-4 ps-12 pr-12 text-sm text-[#24332E] outline-none transition focus:border-[#1B4B43] focus:ring-2 focus:ring-[#1B4B43]/10"
            />
          </div>

          <span className="rounded-full bg-[#EFF5F1] px-4 py-2 text-sm font-bold text-[#1B4B43]">
            {filtered.length} محادثة
          </span>
        </div>
      </section>

      {visible.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {visible.map((conv) => {
            const name = conv.other_party_name || "محادثة";
            const course = conv.course_title || "دورة غير محددة";
            const preview =
              conv.last_message_preview || "لا توجد رسائل بعد";

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                prefetch={false}
                className="group block rounded-[24px] border border-[#E0E8E3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#AFCFC0] hover:shadow-[0_12px_35px_rgba(27,75,67,0.09)] sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F1EB] text-[#1B4B43]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-6 w-6"
                    >
                      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.5-.8L4 20l1.8-5A7.5 7.5 0 1 1 20 11.5Z" />
                      <path d="M8.5 11.5h7" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="break-words text-base font-bold text-[#24332E] group-hover:text-[#1B4B43]">
                        {name}
                      </h2>

                      <span className="shrink-0 rounded-full bg-[#EFF5F1] px-3 py-1 text-[11px] font-bold text-[#1B4B43]">
                        عرض المحادثة
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium text-[#59816F]">
                      {course}
                    </p>

                    <div className="mt-4 rounded-xl bg-[#F7F9F7] px-4 py-3">
                      <p className="line-clamp-2 break-words text-sm leading-7 text-[#77847D]">
                        {preview}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[28px] border border-dashed border-[#CADBD0] bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF5F1] text-3xl">
            💬
          </div>

          <h2 className="mt-5 text-xl font-bold text-[#24332E]">
            {search ? "ما لقينا محادثات مطابقة" : "لا توجد محادثات بعد"}
          </h2>

          <p className="mt-2 text-sm text-[#829087]">
            {search
              ? "جرّب البحث باسم آخر أو باسم الدورة."
              : "ستظهر المحادثات هنا عند بدء التواصل داخل المنصة."}
          </p>

          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setVisibleCount(12);
              }}
              className="mt-5 rounded-xl bg-[#1B4B43] px-5 py-2.5 text-sm font-bold text-white"
            >
              مسح البحث
            </button>
          )}
        </section>
      )}

      {filtered.length > visibleCount && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 12)}
            className="rounded-2xl border border-[#C9D9D0] bg-white px-8 py-3 font-bold text-[#1B4B43] transition hover:bg-[#F1F7F3]"
          >
            عرض المزيد من المحادثات
          </button>
        </div>
      )}
    </main>
  );
}
