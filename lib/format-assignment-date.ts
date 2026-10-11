const ARABIC_DIGITS =
  ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicDigits(
  value: string
) {
  return value.replace(
    /\d/g,
    (digit) =>
      ARABIC_DIGITS[
        Number(digit)
      ]
  );
}

export function formatAssignmentDate(
  value: string,
  language: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Amman",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const get = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value ?? "";

  const result =
    `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;

  return language === "ar"
    ? toArabicDigits(
        result
      )
    : result;
}
