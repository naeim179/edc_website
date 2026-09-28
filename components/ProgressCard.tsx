"use client";

import Card from "@/components/ui/Card";
import CardContent from "@/components/ui/CardContent";

export default function ProgressCard() {
  const stats = [
    {
      label: "الواجبات المكتملة",
      value: "12",
      icon: "✓",
    },
    {
      label: "المواد المسجلة",
      value: "06",
      icon: "📖",
    },
    {
      label: "الانتظام",
      value: "85%",
      icon: "📅",
    },
    {
      label: "ساعات التعلم",
      value: "42 س",
      icon: "🕒",
    },
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="
            hover:-translate-y-0.5
          "
        >
          <CardContent
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div className="text-right">
              <span className="block text-xs text-[#6B6258]">
                {stat.label}
              </span>

              <span className="mt-1 block text-xl font-semibold text-[#1F1F1F]">
                {stat.value}
              </span>
            </div>

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#EAF2F0]
                text-sm
                font-semibold
                text-[#1B4B43]
              "
            >
              {stat.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
