import { z } from 'zod';
import { GenerateScheduleOutput as AIGenerateScheduleOutput, ScheduleItem as AIScheduleItem } from "@/ai/flows/smart-schedule-generation";

export const VolunteerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.string(),
  areas: z.array(z.string()),
  availability: z.array(z.string()),
  phone: z.string().optional(),
  email: z.string().optional(),
});
export type Volunteer = z.infer<typeof VolunteerSchema>;


export type EventArea = {
  name: string;
  volunteersNeeded: number;
};

export type Event = {
  id: string;
  name: string;
  frequency: 'Semanal' | 'Pontual';
  dayOfWeek?: string;
  date?: string; // YYYY-MM-DD
  time: string;
  areas: EventArea[];
  responsible?: string;
  contact?: string;
  observations?: string;
};

export type Team = {
  id: string;
  name: string;
};

export type TeamSchedule = {
  id: string;
  team: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  year: number;
  month: number;
};

export type AreaOfService = {
  id: string;
  name: string;
  leader?: string;
  leaderPhone?: string;
};

export type UserPermission = {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string | null;
  userPhotoURL: string | null;
  canManageVolunteers: boolean;
  canManageEvents: boolean;
  canManageAreas: boolean;
  canManageTeams: boolean;
  canViewSchedules: boolean;
  canGenerateSchedules: boolean;
  canManageSettings: boolean;
};

// Renaming the imported type to avoid conflict
export type ScheduleItem = z.infer<typeof AIScheduleItem>;

// We need a Zod schema for SavedSchedule to pass it to the Genkit flow
export const SavedScheduleSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  year: z.number(),
  month: z.number(),
  generationArea: z.string().optional().default('all'), // new field
  data: z.object({ // This is based on GenerateScheduleOutput
    scaleTable: z.string(),
    report: z.object({
        fillRate: z.string(),
        volunteerDistribution: z.string(),
        bottlenecks: z.string(),
        recommendations: z.string(),
    }),
    scheduleData: z.array(z.object({
      date: z.string(),
      dayOfWeek: z.string(),
      assignments: z.array(z.object({ // This is ScheduleItem
          evento: z.string(),
          area: z.string(),
          equipe: z.string().nullable(),
          voluntario_alocado: z.string().nullable(),
          status: z.enum(["Preenchida", "Falha"]),
          motivo: z.string().nullable(),
      })),
    })),
  }),
});

export type SavedSchedule = z.infer<typeof SavedScheduleSchema>;

// This represents one "row" or "slot" in the manual schedule creation table
export type ScheduleSlot = {
  date: Date;
  dayOfWeek: string;
  event: string;
  eventId: string;
  area: string;
  team: string | null;
  volunteerId: string | null;
  slotKey: string;
};

// This type represents a single assignment within a schedule, enriched with date info
export type ScheduleAssignment = ScheduleItem & {
  fullDate: string;
  dayOfWeek: string;
};

// This is the original AI output, we keep it for compatibility with existing types
export type GenerateScheduleOutput = AIGenerateScheduleOutput;

export const SecretsSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});
export type Secrets = z.infer<typeof SecretsSchema>;


export const TestEmailRequestSchema = z.object({
  recipient: z.string().email(),
  secrets: z.object({
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.string().optional(),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  }),
});
export type TestEmailRequest = z.infer<typeof TestEmailRequestSchema>;


export const TestWhatsAppRequestSchema = z.object({
  recipient: z.string(),
  secrets: z.object({
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  }),
});
export type TestWhatsAppRequest = z.infer<typeof TestWhatsAppRequestSchema>;

export const NotificationRequestSchema = z.object({
  schedule: SavedScheduleSchema,
  volunteers: z.array(VolunteerSchema),
  secrets: z.object({
    EMAIL_USER: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
  }),
});
export type NotificationRequest = z.infer<typeof NotificationRequestSchema>;
