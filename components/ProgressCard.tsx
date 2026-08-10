'use client';

export default function ProgressCard() {
  const stats = [
    { label: 'الواجبات المكتملة', value: '12', icon: '✓', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'المواد المسجلة', value: '06', icon: '📖', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'الانتظام', value: '85%', icon: '📅', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'ساعات التعلم', value: '42 س', icon: '🕒', color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {stats.map((stat, idx) => (
        <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">{stat.label}</span>
            <span className="text-lg font-bold text-slate-800">{stat.value}</span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${stat.color}`}>
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  );
}