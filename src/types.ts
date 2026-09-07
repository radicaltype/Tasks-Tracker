export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  description?: string;
  dueDate?: string;
  location?: string;
}

export type TimeReminderPreset = 
  | 'at_time' 
  | '10m_before' 
  | '30m_before' 
  | '1h_before' 
  | '1d_before' 
  | 'custom';

export interface TimeReminder {
  enabled: boolean;
  remindAt?: string; // ISO string for specific one-off reminder
  time?: string; // HH:mm for recurring daily/weekly reminder
  repeatDays?: number[]; // [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]
  preset?: TimeReminderPreset;
  lastTriggered?: string;
  snoozedUntil?: string;
}

export interface LocationReminder {
  enabled: boolean;
  locationName: string;
  lat?: number;
  lng?: number;
  radiusMeters: number; // e.g. 100, 300, 500, 1000
  triggerType: 'arrive' | 'leave';
  lastTriggered?: string;
  snoozedUntil?: string;
}

export interface TaskReminder {
  timeReminder?: TimeReminder;
  locationReminder?: LocationReminder;
}

export type Priority = 'Low' | 'Medium' | 'High';

export type TaskCategory = 
  | 'Work'
  | 'Personal'
  | 'Home'
  | 'Errands'
  | 'Pay It Forward'
  | 'Friends'
  | 'Family'
  | 'Appointments'
  | 'Projects';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO string
  location: string;
  priority?: Priority;
  category?: TaskCategory;
  completed: boolean;
  timerTotalSeconds: number;
  createdAt: string; // ISO string
  userId: string;
  subtasks?: SubTask[];
  reminder?: TaskReminder;
}

export type View = 'list' | 'add' | 'details' | 'dashboard';

