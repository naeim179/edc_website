export interface Course {
  id: number;
  title: string;
  instructor: string;
  category?: string;
  lessons: number;
  progress: number;
  image: string;
  description?: string;
}

export const courses: Course[] = [
  {
    id: 1,
    title: "الأمن السيبراني",
    instructor: "أحمد الشريف",
    category: "علوم الحاسب",
    lessons: 24,
    progress: 0,
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400&auto=format&fit=crop",
    description:
      "دورة شاملة تغطي أساسيات الأمن السيبراني، من حماية الشبكات إلى اختبار الاختراق الأخلاقي، مع تطبيقات عملية على أدوات حقيقية.",
  },
  {
    id: 2,
    title: "أساسيات الشبكات",
    instructor: "سارة يوسف",
    category: "علوم الحاسب",
    lessons: 18,
    progress: 0,
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=400&auto=format&fit=crop",
    description:
      "تعلم مفاهيم الشبكات من الصفر: بروتوكولات TCP/IP، الراوترات، والسويتشات، مع أمثلة تطبيقية.",
  },
  {
    id: 3,
    title: "مقدمة في الذكاء الاصطناعي",
    instructor: "خالد منصور",
    category: "الذكاء الاصطناعي",
    lessons: 30,
    progress: 0,
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=400&auto=format&fit=crop",
    description:
      "استكشف أساسيات الذكاء الاصطناعي وتعلم الآلة، وابنِ أول نموذج تنبؤي بسيط باستخدام بايثون.",
  },
];
