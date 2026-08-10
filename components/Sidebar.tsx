'use client';

export default function Sidebar() {
  return (
    <aside className="rtl flex flex-col h-[970px] p-[15px_16px_17px] rounded-[16px] text-white bg-[radial-gradient(circle_at_70%_35%,rgba(26,154,111,0.32),transparent_42%),linear-gradient(180deg,#076b4a_0%,#087a54_54%,#066b49_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
      {/* Logo */}
      <div className="h-[55px] flex ltr items-center justify-between px-[3px] mb-[7px]">
        <div className="flex ltr items-center gap-[10px] text-[17px] font-bold whitespace-nowrap">
          <svg className="w-[34px] h-[34px] fill-white stroke-white stroke-[1.1]" viewBox="0 0 64 48">
            <path d="M4 15 32 2l28 13-28 13z"/>
            <path d="M14 21v13c9 8 27 8 36 0V21" fill="none" strokeWidth="4"/>
            <path d="M58 17v17" fill="none" strokeWidth="4"/>
            <circle cx="58" cy="36" r="3"/>
          </svg>
          <span className="rtl">منصتي التعليمية</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-[2px]">
        <button className="h-[46px] border-0 rounded-[10px] bg-white/20 text-white flex ltr items-center gap-[14px] px-[13px] text-[15.5px] text-right transition-all">
          <span className="rtl w-full">الرئيسية</span>
        </button>
        <button className="h-[46px] border-0 rounded-[10px] bg-transparent text-white flex ltr items-center gap-[14px] px-[13px] text-[15.5px] text-right hover:bg-white/10 transition-all">
          <span className="rtl w-full">موادي</span>
        </button>
        <button className="h-[46px] border-0 rounded-[10px] bg-transparent text-white flex ltr items-center gap-[14px] px-[13px] text-[15.5px] text-right hover:bg-white/10 transition-all">
          <span className="rtl w-full">الحصص المباشرة</span>
        </button>
        <button className="h-[46px] border-0 rounded-[10px] bg-transparent text-white flex ltr items-center gap-[14px] px-[13px] text-[15.5px] text-right hover:bg-white/10 transition-all">
          <span className="rtl w-full">الواجبات</span>
        </button>
        <button className="h-[46px] border-0 rounded-[10px] bg-transparent text-white flex ltr items-center gap-[14px] px-[13px] text-[15.5px] text-right hover:bg-white/10 transition-all">
          <span className="rtl w-full">الاختبارات</span>
        </button>
      </nav>

      {/* Upgrade Box */}
      <section className="mt-[84px] mb-[13px] p-[22px_14px_15px] text-[#174c3d] bg-[linear-gradient(180deg,#f8fffc,#eaf8f2)] rounded-[14px] text-center shadow-[0_5px_18px_rgba(2,50,36,0.12)]">
        <h3 className="m-0 mb-[11px] text-[16px] text-[#0b6f4c] font-bold">ارتقِ بتجربتك التعليمية</h3>
        <p className="m-0 mb-[13px] text-[12px] leading-[1.75] text-[#355b50]">مزايا حصرية ومحتوى إضافي<br/>لمساعدتك على التفوق</p>
        <button className="border-0 rounded-[9px] bg-[linear-gradient(180deg,#0e9264,#08734f)] text-white w-full h-[42px] text-[12px] shadow-[0_6px_15px_rgba(7,117,79,0.22)] font-bold">
          ✨ احصل على العضوية المميزة
        </button>
      </section>

      {/* Sidebar Bottom */}
      <div className="mt-auto flex flex-col gap-[3px]">
        <button className="h-[42px] border-0 rounded-[10px] bg-transparent text-white flex ltr items-center gap-[14px] px-[13px] text-[15.5px] hover:bg-white/10 transition-all">
          <span className="rtl w-full">الإعدادات</span>
        </button>
        <button className="h-[42px] border-0 rounded-[10px] bg-transparent text-white flex ltr items-center gap-[14px] px-[13px] text-[15.5px] hover:bg-white/10 transition-all">
          <span className="rtl w-full">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}