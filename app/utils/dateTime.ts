import { format } from "date-fns";

export const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), "MMM d, yyyy - HH:mm 'UTC'");
};

export const formatUTCDate = formatDateTime; // For consistency, we'll use the same format
