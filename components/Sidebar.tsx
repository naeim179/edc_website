'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  ClipboardList, 
  MessageSquare, 
  User,
  Settings
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  // روابط القائمة الجانبية
  const navItems = [
    { name: 'الرئيسية', href: '/', icon: Home },
    { name: 'جميع الدورات', href: '/courses', icon: BookOpen },
    { name: 'دوراتي', href: '/my-courses', icon: GraduationCap },
    { name: 'الواجبات', href: '/assignments', icon: ClipboardList },
    { name: 'الرسائل', href: '/messages', icon: MessageSquare },
    { name: 'الملف الشخصي', href: '/profile', icon: User },
  ];

  return (
    // استخدام خلفية بيضاء مع ظل خفيف لبروز القائمة
    <aside className="w-64 bg-white border-l border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-screen sticky top-0 flex flex-col transition-all font-sans hidden lg:flex">
      
      {/* 1. قسم اللوجو */}
      <div className="p-8 text-center border-b border-gray-50 mb-4">
        <h2 className="text-2xl font-black text-gray-900 tracking-wider">YOUR WAY</h2>
        <p className="text-xs text-gray-400 mt-2 font-medium">مساحتك للتعلّم والتقدّم</p>
      </div>

      {/* 2. روابط التصفح */}
      <div className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          // التحقق إذا كان الرابط هو الصفحة الحالية
          const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/');
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-800 font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-emerald-600 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* 3. الفوتر (الإعدادات أو تلميح بسيط) */}
      <div className="p-6 mt-auto border-t border-gray-50 bg-gray-50/50">
        <div className="flex items-center justify-between text-gray-400 hover:text-emerald-600 cursor-pointer transition-colors">
          <span className="text-xs font-medium">خطوتك القادمة تبدأ من هنا.</span>
          <Settings className="w-4 h-4 hover:animate-spin" />
        </div>
      </div>

    </aside>
  );
}
