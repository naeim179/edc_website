export function formatLessons(n: number, isArabic: boolean) {
  if (!isArabic) {
    if (n === 0) return "No lessons";
    return `${n} ${n === 1 ? "lesson" : "lessons"}`;
  }

  if (n === 0) return "لا دروس";
  if (n === 1) return "درس واحد";
  if (n === 2) return "درسان";
  if (n >= 3 && n <= 10) return `${n} دروس`;
  return `${n} درسًا`;
}
