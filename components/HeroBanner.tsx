'use client';

export default function HeroBanner() {
  return (
    <section className="relative w-full rounded-[20px] p-6 text-white overflow-hidden bg-[radial-gradient(circle_at_70%_30%,rgba(20,130,90,0.8),transparent_50%),linear-gradient(135deg,#05402b_0%,#086b48_50%,#043322_100%)] shadow-lg">
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Right Side: Welcome Text & CTA */}
        <div className="flex flex-col items-start text-right space-y-3 max-w-lg">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span>👋</span>
            <span>مرحباً بعودتك يا خالد</span>
          </h2>
          
          <p className="text-emerald-100 text-sm md:text-base font-medium">
            أنت في الصف الثاني الثانوي
          </p>
          
          <p className="text-emerald-200/80 text-xs md:text-sm">
            استمر في التعلم اليوم، كل خطوة تقربك من هدفك.
          </p>

          <button className="mt-2 px-6 py-2.5 rounded-xl bg-[#00e699] text-[#043322] font-bold text-sm hover:bg-[#00c784] transition-all shadow-md">
            متابعة التعلم
          </button>
        </div>

        {/* Left Side: Stats (XP, Hours, Streak) */}
        <div className="flex items-center gap-4 dir-rtl">
          {/* XP Stat */}
          <div className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-emerald-400/40 bg-emerald-900/30 backdrop-blur-sm">
            <span className="text-lg md:text-xl font-bold text-white">1,250</span>
            <span className="text-[10px] md:text-xs text-emerald-200">نقاط الإنجاز XP</span>
          </div>

          {/* Hours Stat */}
          <div className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-emerald-400/40 bg-emerald-900/30 backdrop-blur-sm">
            <span className="text-lg md:text-xl font-bold text-white">42</span>
            <span className="text-[10px] md:text-xs text-emerald-200">ساعات التعلم هذا الأسبوع</span>
          </div>

          {/* Streak Stat */}
          <div className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-emerald-400/40 bg-emerald-900/30 backdrop-blur-sm">
            <span className="text-lg md:text-xl font-bold text-white">5</span>
            <span className="text-[10px] md:text-xs text-emerald-200">سلسلة الانتظام أيام متتالية</span>
          </div>
        </div>

      </div>
    </section>
  );
}