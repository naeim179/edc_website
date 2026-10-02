// Fixed time zone so server render and browser render match (avoids hydration mismatch).
const TIME_ZONE = "Asia/Amman";

function localeFor(isArabic: boolean) {
  // "nu-latn" keeps Latin digits (0-9). Remove it to get Arabic-Indic digits (٠-٩).
  return isArabic ? "ar-JO-u-nu-latn" : "en-US";
}

export function formatDate(value: string | Date, isArabic: boolean) {
  return new Date(value).toLocaleDateString(localeFor(isArabic), {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(value: string | Date, isArabic: boolean) {
  return new Date(value).toLocaleString(localeFor(isArabic), {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
