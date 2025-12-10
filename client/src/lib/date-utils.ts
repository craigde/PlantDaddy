import { format, formatDistanceToNow as fdtn, isBefore, isToday, addDays } from "date-fns";

export const formatDate = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) {
    console.warn("Invalid date provided to formatDate:", date);
    return "Unknown date";
  }
  return format(date, "MMM d, yyyy");
};

export const formatTime = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) {
    console.warn("Invalid date provided to formatTime:", date);
    return "Unknown time";
  }
  return format(date, "h:mm a");
};

export const formatDateTime = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) {
    console.warn("Invalid date provided to formatDateTime:", date);
    return "Unknown date/time";
  }
  return format(date, "MMM d, yyyy 'at' h:mm a");
};

export const formatDistanceToNow = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) {
    console.warn("Invalid date provided to formatDistanceToNow:", date);
    return "Unknown";
  }
  
  if (isToday(date)) {
    return "Today";
  }
  return `${fdtn(date, { addSuffix: true })}`;
};

export const daysUntilWatering = (lastWatered: Date | string, frequencyInDays: number): number => {
  // Ensure we have a Date object
  const lastWateredDate = lastWatered instanceof Date ? lastWatered : new Date(lastWatered);
  
  // Check if date is valid
  if (isNaN(lastWateredDate.getTime())) {
    console.error("Invalid date in daysUntilWatering:", lastWatered);
    return 0;
  }
  
  const nextWateringDate = addDays(lastWateredDate, frequencyInDays);
  const today = new Date();
  const diffInTime = nextWateringDate.getTime() - today.getTime();
  const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));
  return diffInDays;
};

export const isOverdue = (lastWatered: Date | string, frequencyInDays: number): boolean => {
  // Ensure we have a Date object
  const lastWateredDate = lastWatered instanceof Date ? lastWatered : new Date(lastWatered);
  
  // Check if date is valid
  if (isNaN(lastWateredDate.getTime())) {
    console.error("Invalid date in isOverdue:", lastWatered);
    return false;
  }
  
  const nextWateringDate = addDays(lastWateredDate, frequencyInDays);
  return isBefore(nextWateringDate, new Date());
};

export const getDueText = (lastWatered: Date | string, frequencyInDays: number): string => {
  // Ensure we have a Date object
  const lastWateredDate = lastWatered instanceof Date ? lastWatered : new Date(lastWatered);
  
  // Check if date is valid
  if (isNaN(lastWateredDate.getTime())) {
    console.error("Invalid date in getDueText:", lastWatered);
    return "Unknown status";
  }
  
  const days = daysUntilWatering(lastWateredDate, frequencyInDays);
  
  if (isToday(lastWateredDate)) {
    return "Watered today";
  }
  
  if (days < 0) {
    return `Overdue ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
  }
  
  if (days === 0) {
    return "Due today";
  }
  
  if (days === 1) {
    return "Due tomorrow";
  }
  
  return `Due in ${days} days`;
};
