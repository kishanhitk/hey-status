import { format, formatInTimeZone } from "date-fns-tz";

export const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), "MMM d, yyyy - HH:mm 'UTC'");
};

export const formatUTCDate = formatDateTime; // For consistency, we'll use the same format

export const formatLocalDateTime = (dateString: string | null) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return formatInTimeZone(date, timeZone, "MMM d, yyyy HH:mm zzz");
  } catch (error) {
    console.error("Invalid date:", dateString);
    return "Invalid Date";
  }
};
