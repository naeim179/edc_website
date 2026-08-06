'use client';

export default function Topbar() {
  return (
    <header className="w-full flex items-center justify-between gap-4 py-2 px-1">
      {/* Right Side: User Profile & Notifications */}
      <div className="flex items-center gap-3">
        {/* User Profile */}
        <div className="flex items-center gap-3 bg-white p-2 px-3 rounded-[14px] shadow-sm border border-slate-100">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
            alt="صورة المستخدم"
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
          />
          <div className="flex flex-col text-right">
            <span className="text-[15px] font-bold text-slate-800">خالد العتيبي</span>
            <span className="text-[12px] text-slate-500">الصف الثاني الثانوي</span>
          </div>
        </div>

        {/* Notification Icon */}
        <button className="relative w-11 h-11 bg-white rounded-[14px] flex items-center justify-center text-slate-600 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
          <svg className="w-5 h-5 fill-none stroke-current stroke-[2]" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>
      </div>

      {/* Left Side: Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث عن مادة، درس أو معلم..."
            className="w-full h-11 pr-11 pl-4 bg-white text-slate-700 text-[14px] rounded-[14px] border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#087a54]/20 transition-all text-right"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5 fill-none stroke-current stroke-[2]" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}