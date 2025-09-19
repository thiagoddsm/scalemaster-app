
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Wand2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getDaysInMonth, isWithinInterval, parseISO } from 'date-fns';
import { useAppData } from '@/context/AppDataContext';
import type { Volunteer, ScheduleSlot, SavedSchedule, GenerateScheduleOutput } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { generateColorFromString } from '@/lib/utils';

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export default function SchedulePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { volunteers, events, areasOfService, teams, teamSchedules, saveSchedule } = useAppData();
  const { permissions } = useAuth();
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [generationArea, setGenerationArea] = useState<string>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [isAutoFillConfirmOpen, setIsAutoFillConfirmOpen] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");


  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }) }));

  const monthLabel = useMemo(() => {
    return months.find(m => m.value === month)?.label || '';
  }, [month, months]);
  
  const getTeamForDate = (date: Date): string | null => {
    const schedule = teamSchedules.find(s => {
        const start = parseISO(s.startDate);
        const end = parseISO(s.endDate);
        end.setUTCHours(23, 59, 59, 999);
        return isWithinInterval(date, { start, end });
    });
    return schedule ? schedule.team : teams[0]?.name || null;
  }

  const generateManualScheduleSkeleton = () => {
    setIsGenerating(true);
    setScheduleSlots([]);
    const y = parseInt(year);
    const m = parseInt(month) - 1;
    const daysInMonth = getDaysInMonth(new Date(y, m));
    const slots: ScheduleSlot[] = [];

    const processEvent = (event: typeof events[0], date: Date) => {
        const dayOfWeek = weekDays[date.getUTCDay()];
        const teamForDate = getTeamForDate(date);
        
        event.areas.forEach(area => {
            if (generationArea !== 'all' && area.name !== generationArea) {
                return;
            }
            for (let i = 0; i < area.volunteersNeeded; i++) {
                slots.push({
                    date: date,
                    dayOfWeek: dayOfWeek,
                    event: event.name,
                    eventId: event.id,
                    area: area.name,
                    team: teamForDate,
                    volunteerId: null,
                    slotKey: `${event.id}-${area.name}-${date.toISOString()}-${i}`
                });
            }
        });
    }

    // Expand weekly events
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(Date.UTC(y, m, day));
        const dayOfWeek = weekDays[currentDate.getUTCDay()];
        
        events.filter(e => e.frequency === 'Semanal' && e.dayOfWeek === dayOfWeek)
            .forEach(event => processEvent(event, currentDate));
    }
    
    // Add punctual events
     events.filter(e => e.frequency === 'Pontual' && e.date).forEach(event => {
        const eventDate = parseISO(`${event.date!}T00:00:00.000Z`);

        if (eventDate.getUTCFullYear() === y && eventDate.getUTCMonth() === m) {
            processEvent(event, eventDate);
        }
    });

    slots.sort((a,b) => a.date.getTime() - b.date.getTime() || a.event.localeCompare(b.event) || a.area.localeCompare(b.area));
    setScheduleSlots(slots);
    setIsGenerating(false);
  };
  
  const handleVolunteerChange = (slotKey: string, volunteerId: string) => {
    const newVolunteerId = volunteerId === "null" ? null : volunteerId;
    setScheduleSlots(prev => 
      prev.map(slot => slot.slotKey === slotKey ? { ...slot, volunteerId: newVolunteerId } : slot)
    );
  };
  
  const getEligibleVolunteers = (areaName: string, teamName: string | null, eventName: string): Volunteer[] => {
    return volunteers
      .filter(v => 
        v.areas.includes(areaName) &&
        (v.team === teamName || v.team === 'N/A' || !teamName) &&
        v.availability.includes(eventName)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  const filteredScheduleSlots = useMemo(() => {
    return scheduleSlots.filter(slot => {
        const searchTermLower = searchTerm.toLowerCase();
        const searchMatch = !searchTerm ||
            slot.event.toLowerCase().includes(searchTermLower) ||
            slot.area.toLowerCase().includes(searchTermLower) ||
            (volunteers.find(v => v.id === slot.volunteerId)?.name || '').toLowerCase().includes(searchTermLower);

        const dayOfWeekMatch = dayOfWeekFilter === 'all' || slot.dayOfWeek === dayOfWeekFilter;
        const eventMatch = eventFilter === 'all' || slot.event === eventFilter;
        const areaMatch = areaFilter === 'all' || slot.area === areaFilter;
        const teamMatch = teamFilter === 'all' || slot.team === teamFilter;

        return searchMatch && dayOfWeekMatch && eventMatch && areaMatch && teamMatch;
    });
  }, [scheduleSlots, searchTerm, dayOfWeekFilter, eventFilter, areaFilter, teamFilter, volunteers]);

  const handleAutoFill = () => {
    const serviceCount: { [key: string]: number } = {};
    volunteers.forEach(v => serviceCount[v.id] = 0);

    const filledSlots = scheduleSlots.map(slot => {
        if (slot.volunteerId) {
            serviceCount[slot.volunteerId]++;
            return slot;
        }
      
      const eligible = getEligibleVolunteers(slot.area, slot.team, slot.event);
      if (eligible.length === 0) {
        return { ...slot, volunteerId: null };
      }

      const assignedInEvent = scheduleSlots
        .filter(s => s.date.getTime() === slot.date.getTime() && s.event === slot.event && s.volunteerId)
        .map(s => s.volunteerId);

      const available = eligible.filter(v => !assignedInEvent.includes(v.id));
      if (available.length === 0) {
        return { ...slot, volunteerId: null };
      }

      available.sort((a, b) => {
        const countA = serviceCount[a.id] || 0;
        const countB = serviceCount[b.id] || 0;
        if (countA !== countB) {
          return countA - countB;
        }
        return a.name.localeCompare(b.name);
      });

      const bestCandidate = available[0];
      serviceCount[bestCandidate.id]++;
      
      return { ...slot, volunteerId: bestCandidate.id };
    });

    setScheduleSlots(filledSlots);
    setIsAutoFillConfirmOpen(false);
    toast({
        title: "Escala Preenchida!",
        description: "As vagas foram preenchidas automaticamente com base nas regras."
    });
  };

  const handleSaveSchedule = async () => {
    const title = `Escala de ${monthLabel} de ${year}`;
    
    const scheduleData = scheduleSlots.reduce((acc, slot) => {
        const dateStr = slot.date.toISOString().split('T')[0];
        let dayEntry = acc.find(d => d.date === dateStr);
        if (!dayEntry) {
            dayEntry = { date: dateStr, dayOfWeek: slot.dayOfWeek, assignments: [] };
            acc.push(dayEntry);
        }

        const volunteer = volunteers.find(v => v.id === slot.volunteerId);
        dayEntry.assignments.push({
            evento: slot.event,
            area: slot.area,
            equipe: slot.team,
            voluntario_alocado: volunteer?.name || null,
            status: volunteer ? "Preenchida" : "Falha",
            motivo: volunteer ? null : "Nenhum voluntário atribuído"
        });

        return acc;
    }, [] as GenerateScheduleOutput['scheduleData']);
    
    scheduleData.sort((a,b) => a.date.localeCompare(b.date));

    const finalData: GenerateScheduleOutput = {
        scaleTable: "Gerado manualmente",
        report: {
            fillRate: "",
            volunteerDistribution: "",
            bottlenecks: "",
            recommendations: "Escala gerada manualmente. Análise não aplicável.",
        },
        scheduleData,
    };
    
    const newSavedSchedule: Omit<SavedSchedule, 'id'> = {
        title: title,
        createdAt: new Date().toISOString(),
        year: parseInt(year),
        month: parseInt(month),
        data: finalData,
        generationArea: generationArea, // Save the generation context
    };

    await saveSchedule(newSavedSchedule);
    
    toast({
      title: 'Escala Salva!',
      description: `A escala para ${monthLabel} de ${year} foi salva com sucesso.`,
    });

    router.push('/schedules');
  };
  
  const canManage = permissions?.canGenerateSchedules ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Montar Escala</h1>
        <p className="text-muted-foreground">
          Selecione o período, monte o esqueleto da escala e preencha as vagas manualmente ou automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Período da Escala</CardTitle>
          <CardDescription>
            Escolha o mês, ano e a área para montar a escala.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="month-select" className="text-sm font-medium">Mês</label>
            <Select value={month} onValueChange={setMonth} disabled={!canManage}>
              <SelectTrigger id="month-select">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label htmlFor="year-select" className="text-sm font-medium">Ano</label>
            <Select value={year} onValueChange={setYear} disabled={!canManage}>
              <SelectTrigger id="year-select">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
           <div className="flex-1">
            <label htmlFor="area-select" className="text-sm font-medium">Área de Serviço</label>
            <Select value={generationArea} onValueChange={setGenerationArea} disabled={!canManage}>
              <SelectTrigger id="area-select">
                <SelectValue placeholder="Selecione a Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                {areasOfService.map(area => <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={generateManualScheduleSkeleton} disabled={isGenerating || !canManage} className="w-full sm:w-auto">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Montando...
                </>
              ) : (
                'Montar Esqueleto'
              )}
            </Button>
             <Button 
              onClick={() => setIsAutoFillConfirmOpen(true)} 
              disabled={scheduleSlots.length === 0 || !canManage}
              variant="outline"
              className="w-full sm:w-auto"
            >
                <Wand2 className="mr-2 h-4 w-4" />
                Preencher Auto.
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {scheduleSlots.length > 0 && (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Escala para {monthLabel} de {year}</CardTitle>
                    <CardDescription>Atribua um voluntário para cada vaga necessária.</CardDescription>
                  </div>
                  <Button onClick={handleSaveSchedule} disabled={!canManage}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Escala
                  </Button>
                </div>
                 <div className="flex flex-col md:flex-row gap-2 mt-4 flex-wrap">
                   <div className="relative w-full md:flex-1 min-w-[200px]">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                     <Input
                        type="search"
                        placeholder="Buscar..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                   </div>
                  <Select value={dayOfWeekFilter} onValueChange={setDayOfWeekFilter}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <SelectValue placeholder="Filtrar por Dia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Dias</SelectItem>
                      {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                    </SelectContent>
                  </Select>
                   <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <SelectValue placeholder="Filtrar por Evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Eventos</SelectItem>
                      {[...new Set(events.map(e => e.name))].map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <SelectValue placeholder="Filtrar por Área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Áreas</SelectItem>
                      {[...new Set(areasOfService.map(a => a.name))].map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <SelectValue placeholder="Filtrar por Equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Equipes</SelectItem>
                      {[...new Set(teams.map(t => t.name))].map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table className="responsive-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Área</TableHead>
                                <TableHead>Equipe</TableHead>
                                <TableHead className="w-[250px]">Voluntário</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {filteredScheduleSlots.length > 0 ? filteredScheduleSlots.map((slot) => {
                                const eligibleVolunteers = getEligibleVolunteers(slot.area, slot.team, slot.event);
                                const teamColor = slot.team ? generateColorFromString(slot.team) : null;
                                const eventColor = generateColorFromString(slot.event);
                                return (
                                <TableRow key={slot.slotKey}>
                                    <TableCell data-label="Data">
                                        <div className="font-medium">{slot.date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                                        <div className="text-sm text-muted-foreground md:hidden">{slot.dayOfWeek}</div>
                                    </TableCell>
                                    <TableCell data-label="Evento">
                                        <Badge style={{ backgroundColor: eventColor.bgColor, color: eventColor.textColor }} variant="outline">{slot.event}</Badge>
                                    </TableCell>
                                    <TableCell data-label="Área">
                                        <Badge variant="outline">{slot.area}</Badge>
                                    </TableCell>
                                     <TableCell data-label="Equipe">
                                        {slot.team && teamColor && (
                                            <Badge style={{ backgroundColor: teamColor.bgColor, color: teamColor.textColor }} variant="secondary">{slot.team}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell data-label="Voluntário">
                                        <Select
                                            value={slot.volunteerId ?? 'null'}
                                            onValueChange={(volunteerId) => handleVolunteerChange(slot.slotKey, volunteerId)}
                                            disabled={!canManage}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um voluntário" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null">-- Nenhum --</SelectItem>
                                                {eligibleVolunteers.length > 0 ? (
                                                  eligibleVolunteers.map(v => (
                                                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                  ))
                                                ) : (
                                                  <SelectItem value="none" disabled>Nenhum voluntário elegível</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                           )}) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhuma vaga encontrada para os filtros aplicados.
                                </TableCell>
                            </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}

      <AlertDialog open={isAutoFillConfirmOpen} onOpenChange={setIsAutoFillConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preencher Automaticamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação tentará preencher todas as vagas vazias com os voluntários mais elegíveis, respeitando as regras de rodízio e disponibilidade. As atribuições manuais existentes não serão alteradas. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAutoFill}>Sim, Preencher</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
