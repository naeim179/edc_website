'use client';

import React from 'react';
import { Search, LogOut, SlidersHorizontal } from 'lucide-react';

export default function Topbar() {
  // افتراض بيانات المستخدم بناءً على الصورة
  const user = { name: 'naim', role: 'طالب', initial: 'N' };

  return (
    // الشريط العلوي بخلفية بيضاء وخط سفلي ناعم
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 font-sans shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
      
      {/* 1. شريط البحث (على اليمين في واجهة RTL) */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-emerald-600 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder="ابحث عن دورة أو تصنيف أو مدرب..." 
            className="w-full bg-slate-50 border border-gray-100 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 rounded-xl pr-12 pl-4 py-2.5 text-sm text-gray-700 outline-none transition-all placeholder-gray-400"
          />
        </div>
      </div>

      {/* 2. أدوات المستخدم (على اليسار في واجهة RTL) */}
      <div className="flex items-center gap-4">
        
        {/* زر الفلاتر / الإعدادات */}
        <button className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm">
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* بطاقة معلومات المستخدم (الملف الشخصي) */}
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-1 pr-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800 leading-none">{user.name}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">{user.role}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {user.initial}
          </div>
        </div>

        {/* زر تسجيل الخروج */}
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-sm font-bold shadow-sm group">
          <span className="group-hover:-translate-x-0.5 transition-transform">تسجيل الخروج</span>
          <LogOut className="w-4 h-4" />
        </button>
        
      </div>
    </header>
  );
}
