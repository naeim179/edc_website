-- 1. جدول الدورات (Courses)
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. جدول الأقسام (Sections)
CREATE TABLE public.sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. جدول الدروس (Lessons)
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content_url TEXT,
  is_free_preview BOOLEAN DEFAULT false,
  order_index INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- تفعيل سياسات الأمان (Row Level Security - RLS)
-- -------------------------------------------------------

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- سياسات جدول الدورات
CREATE POLICY "الجميع يمكنهم قراءة الدورات المنشورة" 
  ON public.courses FOR SELECT 
  USING (is_published = true);

CREATE POLICY "المدرب يمكنه إدارة دوراته فقط" 
  ON public.courses FOR ALL 
  USING (auth.uid() = instructor_id);

-- سياسات جدول الأقسام
CREATE POLICY "قراءة الأقسام متاحة للجميع" 
  ON public.sections FOR SELECT 
  USING (true);

-- سياسات جدول الدروس
CREATE POLICY "قراءة الدروس متاحة للجميع" 
  ON public.lessons FOR SELECT 
  USING (true);