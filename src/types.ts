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

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency; // 'daily' | 'weekly' | 'monthly'
  interval: number; // e.g., 1 (every 1 day/week/month), 2 (every 2 weeks), etc.
  weekDays?: number[]; // For weekly recurrence: [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]
  endDate?: string; // Optional end date as ISO string (YYYY-MM-DD or ISO)
  timesRepeated?: number; // Count of occurrences generated
}

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
  tags?: string[]; // Custom user-defined tags or labels
  completed: boolean;
  timerTotalSeconds: number;
  createdAt: string; // ISO string
  userId: string;
  subtasks?: SubTask[];
  reminder?: TaskReminder;
  recurrence?: RecurrenceRule;
  recurrenceParentId?: string; // If this task was spawned from a recurring schedule
  completedAt?: string; // ISO string when completed
  notes?: string; // Rich text notes (HTML/formatted string for meeting minutes, project drafts, etc.)
  notesUpdatedAt?: string; // ISO string timestamp of the last note edit
}

export type View = 'list' | 'add' | 'details' | 'dashboard';

