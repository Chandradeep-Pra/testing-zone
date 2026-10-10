export function formatRelativeAttended(dateInput: unknown): string {
  if (!dateInput) return "Today";
  const date =
    dateInput instanceof Date
      ? dateInput
      : typeof (dateInput as { toDate?: () => Date })?.toDate === "function"
        ? (dateInput as { toDate: () => Date }).toDate()
        : new Date(String(dateInput));

  if (Number.isNaN(date.getTime())) return "Today";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Today";

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "1 day ago";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) {
    return "1 week ago";
  }
  if (diffWeeks < 4) {
    return `${diffWeeks} weeks ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths <= 1) {
    return "1 month ago";
  }
  if (diffMonths < 12) {
    return `${diffMonths} months ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return diffYears <= 1 ? "1 year ago" : `${diffYears} years ago`;
}

