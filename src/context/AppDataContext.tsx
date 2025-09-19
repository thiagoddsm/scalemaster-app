

"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, getDocs, writeBatch, where, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Volunteer, Event, Team, AreaOfService, TeamSchedule, SavedSchedule, UserPermission, ScheduleAssignment, Secrets, TestEmailRequest, TestWhatsAppRequest } from '@/lib/types';
import { startOfMonth, endOfMonth, eachWeekOfInterval, format, addDays, parseISO, isToday, isTomorrow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { sendTestEmail as sendTestEmailFlow } from '@/ai/flows/send-test-email-flow';
import { sendTestWhatsApp as sendTestWhatsAppFlow } from '@/ai/flows/send-test-whatsapp-flow';
import { notifyVolunteersByEmail as notifyVolunteersByEmailFlow } from '@/ai/flows/send-notification-flow';
import { notifyVolunteersByWhatsApp as notifyVolunteersByWhatsAppFlow } from '@/ai/flows/send-whatsapp-flow';

// Forcing a git commit by adding this comment.
interface AppDataContextType {
  volunteers: Volunteer[];
  events: Event[];
  teams: Team[];
  areasOfService: AreaOfService[];
  teamSchedules: TeamSchedule[];
  savedSchedules: SavedSchedule[];
  userPermissions: UserPermission[];
  secrets: Secrets | null;
  loading: boolean;
  addVolunteer: (volunteer: Omit<Volunteer, 'id'>) => Promise<void>;
  updateVolunteer: (id: string, updatedVolunteer: Partial<Volunteer>) => Promise<void>;
  deleteVolunteer: (id: string) => Promise<void>;
  addEvent: (event: Omit<Event, 'id'>) => Promise<void>;
  updateEvent: (id: string, updatedEvent: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addTeam: (team: Omit<Team, 'id'>) => Promise<void>;
  updateTeam: (id: string, updatedTeam: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addArea: (area: Omit<AreaOfService, 'id'>) => Promise<void>;
  updateArea: (id: string, updatedArea: Partial<AreaOfService>) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  generateTeamSchedules: (year: number, month: number, startTeam: string) => Promise<void>;
  saveSchedule: (schedule: Omit<SavedSchedule, 'id'>) => Promise<void>;
  updateSavedSchedule: (id: string, updatedSchedule: Partial<SavedSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  updateUserPermission: (userId: string, permissions: Partial<UserPermission>) => Promise<void>;
  saveSecrets: (secrets: Secrets) => Promise<void>;
  sendTestEmail: (req: TestEmailRequest) => Promise<{ success: boolean; error?: string }>;
  sendTestWhatsApp: (req: TestWhatsAppRequest) => Promise<{ success: boolean; error?: string }>;
  notifyVolunteersByEmail: (schedule: SavedSchedule) => Promise<{ success: boolean; error?: string, sentCount: number }>;
  notifyVolunteersByWhatsApp: (schedule: SavedSchedule) => Promise<{ success: boolean; error?: string, sentCount: number }>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, permissions: currentUserPermissions, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [areasOfService, setAreasOfService] = useState<AreaOfService[]>([]);
  const [teamSchedules, setTeamSchedules] = useState<TeamSchedule[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [secrets, setSecrets] = useState<Secrets | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      const collectionsToManage = [
        { name: 'volunteers', setter: setVolunteers, orderByField: 'name' },
        { name: 'events', setter: setEvents, orderByField: 'name' },
        { name: 'teams', setter: setTeams, orderByField: 'name' },
        { name: 'areasOfService', setter: setAreasOfService, orderByField: 'name' },
        { name: 'teamSchedules', setter: setTeamSchedules, orderByField: 'startDate' },
        { name: 'savedSchedules', setter: setSavedSchedules, orderByField: 'createdAt' },
        { name: 'userPermissions', setter: setUserPermissions, orderByField: 'userDisplayName' }
      ];

      const unsubscribes = collectionsToManage.map(({ name, setter, orderByField }) => {
        const q = query(collection(db, name), orderBy(orderByField));
        return onSnapshot(q, (querySnapshot) => {
          const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
          setter(data);
        }, (error) => {
          console.error(`Error fetching ${name}:`, error);
        });
      });
      
       // Subscribe to secrets only if user has permission to manage settings.
       // This keeps secrets on the client only when needed.
      let secretsUnsubscribe: (() => void) | null = null;
      if (currentUserPermissions?.canManageSettings) {
        const secretsRef = doc(db, 'secrets', 'credentials');
        secretsUnsubscribe = onSnapshot(secretsRef, (docSnap) => {
            if (docSnap.exists()) {
                setSecrets(docSnap.data() as Secrets);
            } else {
                setSecrets(null);
            }
        }, (error) => {
            console.error("Error fetching secrets on client:", error);
        });
      }
      
      setDataLoading(false);

      return () => {
        unsubscribes.forEach(unsub => unsub());
        if (secretsUnsubscribe) secretsUnsubscribe();
      };
    } else if (!authLoading) {
      setVolunteers([]);
      setEvents([]);
      setTeams([]);
      setAreasOfService([]);
      setTeamSchedules([]);
      setSavedSchedules([]);
      setUserPermissions([]);
      setSecrets(null);
      setDataLoading(false);
    }
  }, [user, authLoading, currentUserPermissions]);

  const addVolunteer = async (volunteer: Omit<Volunteer, 'id'>) => { await addDoc(collection(db, 'volunteers'), volunteer); };
  const updateVolunteer = async (id: string, data: Partial<Volunteer>) => { await updateDoc(doc(db, 'volunteers', id), data); };
  const deleteVolunteer = async (id: string) => { await deleteDoc(doc(db, 'volunteers', id)); };

  const addEvent = async (event: Omit<Event, 'id'>) => { await addDoc(collection(db, 'events'), event); };
  const updateEvent = async (id: string, data: Partial<Event>) => { await updateDoc(doc(db, 'events', id), data); };
  const deleteEvent = async (id: string) => { await deleteDoc(doc(db, 'events', id)); };
  
  const addTeam = async (team: Omit<Team, 'id'>) => { await addDoc(collection(db, 'teams'), team); };
  const updateTeam = async (id: string, data: Partial<Team>) => { await updateDoc(doc(db, 'teams', id), data); };
  const deleteTeam = async (id: string) => { await deleteDoc(doc(db, 'teams', id)); };
  
  const addArea = async (area: Omit<AreaOfService, 'id'>) => { await addDoc(collection(db, 'areasOfService'), area); };
  const updateArea = async (id: string, data: Partial<AreaOfService>) => { await updateDoc(doc(db, 'areasOfService', id), data); };
  const deleteArea = async (id: string) => {
    const areaRef = doc(db, 'areasOfService', id);
    const areaSnap = await getDoc(areaRef);
    const areaName = areaSnap.data()?.name;
    
    if(!areaName) return;

    const batch = writeBatch(db);
    const q = query(collection(db, 'volunteers'), where('areas', 'array-contains', areaName));
    const volunteersToUpdate = await getDocs(q);
    volunteersToUpdate.forEach(vDoc => {
        const vData = vDoc.data() as Volunteer;
        const updatedAreas = vData.areas.filter(a => a !== areaName);
        batch.update(vDoc.ref, { areas: updatedAreas });
    });

    batch.delete(areaRef);
    await batch.commit();
  };
  
  const saveSecrets = async (secrets: Secrets) => {
    const secretsRef = doc(db, 'secrets', 'credentials');
    await setDoc(secretsRef, secrets, { merge: true });
  };

  const generateTeamSchedules = async (year: number, month: number, startTeam: string) => {
    if (teams.length === 0) return;
    const batch = writeBatch(db);

    const oldSchedulesQuery = query(collection(db, 'teamSchedules'), where('year', '==', year), where('month', '==', month));
    const oldSchedulesSnap = await getDocs(oldSchedulesQuery);
    oldSchedulesSnap.forEach(d => batch.delete(d.ref));

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 0 });
    let teamIndex = teams.findIndex(t => t.name === startTeam);
    if (teamIndex === -1) teamIndex = 0;

    weeks.forEach(weekStart => {
        const weekEnd = addDays(weekStart, 6);
        const team = teams[teamIndex % teams.length];
        const newSchedule: Omit<TeamSchedule, 'id'> = {
            team: team.name,
            startDate: format(weekStart, 'yyyy-MM-dd'),
            endDate: format(weekEnd, 'yyyy-MM-dd'),
            year,
            month,
        };
        const docRef = doc(collection(db, 'teamSchedules'));
        batch.set(docRef, newSchedule);
        teamIndex++;
    });

    await batch.commit();
  };
  
  const saveSchedule = async (schedule: Omit<SavedSchedule, 'id'>) => {
    const { year, month, generationArea, data: newData } = schedule;
    
    const q = query(collection(db, 'savedSchedules'), where('year', '==', year), where('month', '==', month));
    const existingSnap = await getDocs(q);

    if (existingSnap.empty) {
        // No schedule exists for this month, create a new one.
        await addDoc(collection(db, 'savedSchedules'), schedule);
    } else {
        // A schedule for this month already exists.
        const existingDoc = existingSnap.docs[0];
        const existingSchedule = existingDoc.data() as SavedSchedule;
        
        if (generationArea === 'all') {
            // If we generated for all areas, we replace the entire schedule.
            await updateDoc(existingDoc.ref, schedule);
        } else {
            // If we generated for a specific area, we merge the results.
            const newAssignments = newData.scheduleData;
            
            // Get all assignments from the existing schedule that are NOT for the area we just generated.
            const preservedAssignments = existingSchedule.data.scheduleData
                .map(day => ({
                    ...day,
                    assignments: day.assignments.filter(a => a.area !== generationArea)
                }))
                .filter(day => day.assignments.length > 0);

            const mergedScheduleData = [...preservedAssignments];

            // Add the new assignments.
            newAssignments.forEach(newDay => {
                const existingDayIndex = mergedScheduleData.findIndex(d => d.date === newDay.date);
                if (existingDayIndex !== -1) {
                    // If day exists, merge assignments
                    mergedScheduleData[existingDayIndex].assignments.push(...newDay.assignments);
                } else {
                    // If day doesn't exist, add it
                    mergedScheduleData.push(newDay);
                }
            });

            // Sort for consistency
            mergedScheduleData.sort((a,b) => a.date.localeCompare(b.date));
            mergedScheduleData.forEach(day => day.assignments.sort((a, b) => a.evento.localeCompare(b.evento) || a.area.localeCompare(b.area)));

            const finalData = {
                ...existingSchedule.data,
                scheduleData: mergedScheduleData
            };
            
            await updateDoc(existingDoc.ref, { data: finalData, updatedAt: new Date().toISOString() });
        }
    }
  };

  const updateSavedSchedule = async (id: string, data: Partial<SavedSchedule>) => { await updateDoc(doc(db, 'savedSchedules', id), data); };
  const deleteSchedule = async (id: string) => { await deleteDoc(doc(db, 'savedSchedules', id)); };
  const updateUserPermission = async (userId: string, permissions: Partial<UserPermission>) => {
    await updateDoc(doc(db, 'userPermissions', userId), permissions);
  };
  
  const sendTestEmail = async (req: TestEmailRequest) => {
    return await sendTestEmailFlow(req);
  };

  const sendTestWhatsApp = async (req: TestWhatsAppRequest) => {
    return await sendTestWhatsAppFlow(req);
  };
  
  const notifyVolunteersByEmail = async (schedule: SavedSchedule) => {
    return await notifyVolunteersByEmailFlow({
      schedule,
      volunteers,
      events,
      secrets: {
        EMAIL_USER: secrets?.EMAIL_USER,
        EMAIL_FROM: secrets?.EMAIL_FROM,
        EMAIL_PASS: secrets?.EMAIL_PASS,
      }
    });
  }
  
  const notifyVolunteersByWhatsApp = async (schedule: SavedSchedule) => {
    return await notifyVolunteersByWhatsAppFlow({
      schedule,
      volunteers,
      events,
      secrets: {
        TWILIO_ACCOUNT_SID: secrets?.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: secrets?.TWILIO_AUTH_TOKEN,
        TWILIO_WHATSAPP_NUMBER: secrets?.TWILIO_WHATSAPP_NUMBER,
      }
    });
  }

  const value = {
    volunteers, events, teams, areasOfService, teamSchedules, savedSchedules, userPermissions, secrets,
    loading: authLoading || dataLoading,
    addVolunteer, updateVolunteer, deleteVolunteer,
    addEvent, updateEvent, deleteEvent,
    addTeam, updateTeam, deleteTeam,
    addArea, updateArea, deleteArea,
    generateTeamSchedules,
    saveSchedule, updateSavedSchedule, deleteSchedule,
    updateUserPermission,
    saveSecrets,
    sendTestEmail,
    sendTestWhatsApp,
    notifyVolunteersByEmail,
    notifyVolunteersByWhatsApp,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
