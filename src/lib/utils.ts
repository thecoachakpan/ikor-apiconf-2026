export const formatNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  }
  if (num >= 1000000) {
    const millions = Math.floor(num / 100000) / 10;
    return `${millions} million`;
  }
  return num.toLocaleString();
};

export const formatDays = (days: number): string => {
  if (days >= 365) {
    return '1 year';
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`;
};

export const formatTimeParts = (minutes: number): { value: string; unit: string } => {
  if (minutes < 60) {
    return { value: minutes.toString(), unit: 'mins' };
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourStr = hours === 1 ? '1 hr' : `${hours} hrs`;
  if (mins === 0) {
    return { value: hourStr, unit: '' };
  }
  return { value: `${hourStr} ${mins}`, unit: 'mins' };
};
