import { format } from "date-fns";

export const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
};

export const formatUTCDate = (dateString: string) => {
  return format(new Date(dateString), "MMM d, HH:mm 'UTC'");
};
