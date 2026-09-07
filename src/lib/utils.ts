import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h > 0 ? h.toString().padStart(2, '0') : null,
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0'),
  ].filter(Boolean).join(':');
}

export function getPriorityConfig(priority?: 'Low' | 'Medium' | 'High') {
  switch (priority) {
    case 'High':
      return {
        label: 'High',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        borderClass: 'border-l-rose-500',
        iconColor: 'text-rose-600',
      };
    case 'Medium':
      return {
        label: 'Medium',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
        borderClass: 'border-l-amber-500',
        iconColor: 'text-amber-600',
      };
    case 'Low':
      return {
        label: 'Low',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
        borderClass: 'border-l-slate-400',
        iconColor: 'text-slate-500',
      };
    default:
      return null;
  }
}

export const TASK_CATEGORIES = [
  'Work',
  'Personal',
  'Home',
  'Errands',
  'Pay It Forward',
  'Friends',
  'Family',
  'Appointments',
  'Projects',
] as const;

export type TaskCategoryType = typeof TASK_CATEGORIES[number];

export function getCategoryConfig(category?: string | null) {
  if (!category) return null;
  const normalized = category.trim().toLowerCase();

  switch (normalized) {
    case 'work':
      return {
        label: 'Work',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        activeClass: 'bg-indigo-600 text-white border-indigo-600',
        pillHover: 'hover:bg-indigo-50/70',
        dotClass: 'bg-indigo-500',
        hexColor: '#4f46e5',
        iconName: 'Briefcase',
      };
    case 'personal':
      return {
        label: 'Personal',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
        activeClass: 'bg-blue-600 text-white border-blue-600',
        pillHover: 'hover:bg-blue-50/70',
        dotClass: 'bg-blue-500',
        hexColor: '#2563eb',
        iconName: 'User',
      };
    case 'home':
      return {
        label: 'Home',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        activeClass: 'bg-emerald-600 text-white border-emerald-600',
        pillHover: 'hover:bg-emerald-50/70',
        dotClass: 'bg-emerald-500',
        hexColor: '#059669',
        iconName: 'Home',
      };
    case 'errands':
      return {
        label: 'Errands',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        activeClass: 'bg-amber-600 text-white border-amber-600',
        pillHover: 'hover:bg-amber-50/70',
        dotClass: 'bg-amber-500',
        hexColor: '#d97706',
        iconName: 'ShoppingBag',
      };
    case 'pay it forward':
    case 'pay_it_forward':
      return {
        label: 'Pay It Forward',
        badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/80',
        activeClass: 'bg-fuchsia-600 text-white border-fuchsia-600',
        pillHover: 'hover:bg-fuchsia-50/70',
        dotClass: 'bg-fuchsia-500',
        hexColor: '#c026d3',
        iconName: 'HeartHandshake',
      };
    case 'friends':
      return {
        label: 'Friends',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
        activeClass: 'bg-sky-600 text-white border-sky-600',
        pillHover: 'hover:bg-sky-50/70',
        dotClass: 'bg-sky-500',
        hexColor: '#0284c7',
        iconName: 'Users',
      };
    case 'family':
      return {
        label: 'Family',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
        activeClass: 'bg-purple-600 text-white border-purple-600',
        pillHover: 'hover:bg-purple-50/70',
        dotClass: 'bg-purple-500',
        hexColor: '#9333ea',
        iconName: 'Heart',
      };
    case 'friends, family':
    case 'friends & family':
      return {
        label: 'Friends, Family',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
        activeClass: 'bg-purple-600 text-white border-purple-600',
        pillHover: 'hover:bg-purple-50/70',
        dotClass: 'bg-purple-500',
        hexColor: '#9333ea',
        iconName: 'Users',
      };
    case 'appointments':
    case 'appointment':
      return {
        label: 'Appointments',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
        activeClass: 'bg-teal-600 text-white border-teal-600',
        pillHover: 'hover:bg-teal-50/70',
        dotClass: 'bg-teal-500',
        hexColor: '#0d9488',
        iconName: 'CalendarCheck',
      };
    case 'projects':
    case 'project':
      return {
        label: 'Projects',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        activeClass: 'bg-rose-600 text-white border-rose-600',
        pillHover: 'hover:bg-rose-50/70',
        dotClass: 'bg-rose-500',
        hexColor: '#e11d48',
        iconName: 'FolderKanban',
      };
    default:
      return {
        label: category,
        badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        activeClass: 'bg-neutral-900 text-white border-neutral-900',
        pillHover: 'hover:bg-neutral-100',
        dotClass: 'bg-neutral-400',
        hexColor: '#71717a',
        iconName: 'Tag',
      };
  }
}

/**
 * Returns a Google Maps search/navigation URL for the specified address or location name.
 */
export function getGoogleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/**
 * Formats a Date object into UTC string format YYYYMMDDTHHmmssZ
 */
function formatDateToIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Returns a web link to add this event directly to Google Calendar.
 */
export function getGoogleCalendarUrl(task: {
  title: string;
  description?: string;
  location?: string;
  dueDate?: string;
}): string {
  const startDate = task.dueDate ? new Date(task.dueDate) : new Date();
  // Default duration is 1 hour
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const startStr = formatDateToIcsUtc(startDate);
  const endStr = formatDateToIcsUtc(endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.title,
    details: task.description || '',
    location: task.location || '',
    dates: `${startStr}/${endStr}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Downloads an .ics calendar file for Apple Calendar, Outlook, or Android Native Calendar apps.
 */
export function downloadIcsFile(task: {
  title: string;
  description?: string;
  location?: string;
  dueDate?: string;
}): void {
  const startDate = task.dueDate ? new Date(task.dueDate) : new Date();
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const startStr = formatDateToIcsUtc(startDate);
  const endStr = formatDateToIcsUtc(endDate);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaskFlow//Task Calendar Event//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${task.title.replace(/\n/g, '\\n')}`,
    `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${(task.location || '').replace(/\n/g, '\\n')}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${task.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
