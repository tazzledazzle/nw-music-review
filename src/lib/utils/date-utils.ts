/**
 * Format a date to a human-readable string
 * @param date Date to format
 * @returns Formatted date string (e.g., "Fri, Jan 15 at 8:00 PM")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Format a date to show only the date part
 * @param date Date to format
 * @returns Formatted date string (e.g., "Jan 15, 2023")
 */
export function formatDateOnly(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date to show only the time part
 * @param date Date to format
 * @returns Formatted time string (e.g., "8:00 PM")
 */
export function formatTimeOnly(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Get a relative time string (e.g., "2 days ago", "in 3 hours")
 * @param date Date to format
 * @returns Relative time string
 */
export function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffInSeconds);
  
  // Define time units in seconds
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;
  
  let relativeTime: string;
  
  if (absSeconds < minute) {
    relativeTime = 'just now';
  } else if (absSeconds < hour) {
    const minutes = Math.floor(absSeconds / minute);
    relativeTime = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (absSeconds < day) {
    const hours = Math.floor(absSeconds / hour);
    relativeTime = `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (absSeconds < week) {
    const days = Math.floor(absSeconds / day);
    relativeTime = `${days} day${days > 1 ? 's' : ''}`;
  } else if (absSeconds < month) {
    const weeks = Math.floor(absSeconds / week);
    relativeTime = `${weeks} week${weeks > 1 ? 's' : ''}`;
  } else if (absSeconds < year) {
    const months = Math.floor(absSeconds / month);
    relativeTime = `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(absSeconds / year);
    relativeTime = `${years} year${years > 1 ? 's' : ''}`;
  }
  
  return diffInSeconds < 0 ? `${relativeTime} ago` : `in ${relativeTime}`;
}

/**
 * Format a date range (e.g., "Jan 15 - Jan 20, 2023")
 * @param startDate Start date
 * @param endDate End date
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  if (startYear !== endYear) {
    return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
  } else if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
  } else {
    return `${startMonth} ${startDay} - ${endDay}, ${endYear}`;
  }
}