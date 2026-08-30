'use client';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      router.push("/courses");
      return;
    }

    router.push(`/courses?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <header className="w-full flex items-center justify-between gap-4 py-2 px-1">
      {/* Right Side: User Profile */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-white p-2 px-3 rounded-[14px] shadow-sm border border-slate-100">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
            alt="صورة المستخدم"
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
          />

          <div className="flex flex-col text-right">
            <span className="text-[15px] font-bold text-slate-800">
              خالد العتيبي
            </span>

            <span className="text-[12px] text-slate-500">
              الصف الثاني الثانوي
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-md"
        role="search"
      >
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن دورة، تصنيف أو مدرب..."
            className="w-full h-11 pr-11 pl-4 bg-white text-slate-700 text-[14px] rounded-[14px] border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#087a54]/20 transition-all text-right"
          />

          <button
            type="submit"
            aria-label="بحث"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#087a54] transition-colors"
          >
            <svg
              className="w-5 h-5 fill-none stroke-current stroke-[2]"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </form>
    </header>
  );
}
