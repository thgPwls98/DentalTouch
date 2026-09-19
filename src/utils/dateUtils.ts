/**
 * Date utility helpers for weekly view and clinic scheduling
 * All dates and times strictly reference Korean Standard Time (Asia/Seoul, UTC+9)
 */

export const formatDate = (d: Date): string => {
  // Use Asia/Seoul timezone to ensure seamless sync in hospitals regardless of client/server time
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value || String(d.getFullYear());
  const month = parts.find((p) => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0');
  const day = parts.find((p) => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getNowTimeString = (): string => {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(new Date());
};

export const parseDateString = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export interface WeekRange {
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  startLabel: string; // MM.DD (월)
  endLabel: string; // MM.DD (일)
  fullLabel: string; // YYYY.MM.DD ~ YYYY.MM.DD
  days: { date: string; dayLabel: string; dayOfWeek: string; isToday: boolean }[];
  isCurrentWeek: boolean;
}

const KOREAN_DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export const getTodayDateString = (): string => {
  return formatDate(new Date());
};

export const getKoreanDayOfWeek = (dateStrOrDate: string | Date): string => {
  const d = typeof dateStrOrDate === 'string' ? parseDateString(dateStrOrDate) : dateStrOrDate;
  return KOREAN_DAY_NAMES[d.getDay()];
};

export const getWeekRange = (anchorDateStr: string = getTodayDateString()): WeekRange => {
  const anchor = parseDateString(anchorDateStr);
  const day = anchor.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat

  // Monday as the first day of the week
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = formatDate(monday);
  const endDate = formatDate(sunday);

  const todayStr = getTodayDateString();
  const isCurrentWeek = todayStr >= startDate && todayStr <= endDate;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = formatDate(d);
    const dayName = KOREAN_DAY_NAMES[d.getDay()];
    days.push({
      date: dStr,
      dayLabel: `${d.getMonth() + 1}.${d.getDate()}`,
      dayOfWeek: dayName,
      isToday: dStr === todayStr,
    });
  }

  const startM = monday.getMonth() + 1;
  const startD = monday.getDate();
  const endM = sunday.getMonth() + 1;
  const endD = sunday.getDate();

  return {
    startDate,
    endDate,
    startLabel: `${startM}.${startD} (월)`,
    endLabel: `${endM}.${endD} (일)`,
    fullLabel: `${startDate.replace(/-/g, '.')} (월) ~ ${endDate.replace(/-/g, '.')} (일)`,
    days,
    isCurrentWeek,
  };
};

export const offsetWeek = (anchorDateStr: string, weeks: number): string => {
  const d = parseDateString(anchorDateStr);
  d.setDate(d.getDate() + weeks * 7);
  return formatDate(d);
};

export const addDays = (anchorDateStr: string, days: number): string => {
  const d = parseDateString(anchorDateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

export const addMonths = (anchorDateStr: string, months: number): string => {
  const d = parseDateString(anchorDateStr);
  d.setMonth(d.getMonth() + months);
  return formatDate(d);
};

export const getDaysDiff = (targetDateStr: string, baseDateStr: string = getTodayDateString()): number => {
  const target = parseDateString(targetDateStr);
  const base = parseDateString(baseDateStr);
  const diffTime = target.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};
