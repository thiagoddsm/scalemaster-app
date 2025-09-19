

"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { SavedSchedule, ScheduleAssignment, Volunteer } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Bell, Mail, Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppDataContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { generateColorFromString } from '@/lib/utils';


const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export default function SchedulesPage() {
  const { savedSchedules, events, areasOfService, teams, volunteers, updateSavedSchedule, deleteSchedule, notifyVolunteersByEmail, notifyVolunteersByWhatsApp } = useAppData();
  const { permissions } = useAuth();
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<SavedSchedule | null>(null);
  
  const [isNotifyEmailDialogOpen, setIsNotifyEmailDialogOpen] = useState(false);
  const [isNotifyWhatsAppDialogOpen, setIsNotifyWhatsAppDialogOpen] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");


  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }) }));
  
  const monthLabel = useMemo(() => months.find(m => m.value === month)?.label, [months, month]);


  const selectedMonthSchedules = useMemo(() => {
    const numericYear = parseInt(year);
    const numericMonth = parseInt(month);
    return savedSchedules.filter(s => s.year === numericYear && s.month === numericMonth);
  }, [savedSchedules, year, month]);
  
  const currentSchedule = useMemo(() => selectedMonthSchedules[0] || null, [selectedMonthSchedules]);

  const volunteersToNotifyByEmail = useMemo(() => {
    if (!currentSchedule) return [];
    const scheduledVolunteerNames = new Set(currentSchedule.data.scheduleData.flatMap(day => day.assignments.map(a => a.voluntario_alocado)).filter(Boolean));
    return volunteers.filter(v => v.email && scheduledVolunteerNames.has(v.name));
  }, [currentSchedule, volunteers]);
  
  const volunteersToNotifyByWhatsApp = useMemo(() => {
    if (!currentSchedule) return [];
    const scheduledVolunteerNames = new Set(currentSchedule.data.scheduleData.flatMap(day => day.assignments.map(a => a.voluntario_alocado)).filter(Boolean));
    return volunteers.filter(v => v.phone && scheduledVolunteerNames.has(v.name));
  }, [currentSchedule, volunteers]);


  const handleAssignmentChange = async (scheduleId: string, assignmentDate: string, assignmentIdentifier: string, newVolunteerId: string) => {
    const newVolunteer = volunteers.find(v => v.id === newVolunteerId);
    
    const scheduleToUpdate = savedSchedules.find(s => s.id === scheduleId);
    if (!scheduleToUpdate) return;
    
    const updatedData = {
        ...scheduleToUpdate.data,
        scheduleData: scheduleToUpdate.data.scheduleData.map(day => {
            if (day.date !== assignmentDate) return day;

            let identifierMatch = false;
            const updatedAssignments = day.assignments.map((assignment, index) => {
                const currentIdentifier = `${assignment.evento}-${assignment.area}-${assignment.voluntario_alocado || 'null'}-${index}`;
                if (currentIdentifier !== assignmentIdentifier || identifierMatch) return assignment;
                
                identifierMatch = true;
                return {
                    ...assignment,
                    voluntario_alocado: newVolunteer ? newVolunteer.name : null,
                    status: newVolunteer ? "Preenchida" : "Falha",
                    motivo: newVolunteer ? null : "Nenhum voluntário atribuído",
                };
            });
             return { ...day, assignments: updatedAssignments };
        }),
    };
    
    await updateSavedSchedule(scheduleId, { data: updatedData });

    toast({
      title: "Escala Atualizada",
      description: `Voluntário alterado para ${newVolunteer ? newVolunteer.name : 'Ninguém'}.`
    });
  };

  const filteredAssignments = useMemo(() => {
    if (!currentSchedule) {
        return [];
    }

    const allAssignments: (ScheduleAssignment & { scheduleId: string; assignmentIndex: number })[] = currentSchedule.data.scheduleData.flatMap(day => 
        day.assignments.map((assignment, index) => ({
            ...assignment,
            fullDate: day.date,
            dayOfWeek: day.dayOfWeek,
            scheduleId: currentSchedule.id,
            assignmentIndex: index,
        }))
    );

    const sortedAssignments = allAssignments.sort((a, b) => {
        const dateA = new Date(a.fullDate).getTime();
        const dateB = new Date(b.fullDate).getTime();
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        if (a.evento < b.evento) return -1;
        if (a.evento > b.evento) return 1;
        if (a.area < b.area) return -1;
        if (a.area > b.area) return 1;
        return 0;
    });

    return sortedAssignments.filter(assignment => {
        const searchTermLower = searchTerm.toLowerCase();
        const searchMatch = !searchTerm ||
            assignment.evento.toLowerCase().includes(searchTermLower) ||
            assignment.area.toLowerCase().includes(searchTermLower) ||
            (assignment.voluntario_alocado || '').toLowerCase().includes(searchTermLower) ||
            (assignment.motivo || '').toLowerCase().includes(searchTermLower);

        const dayOfWeekMatch = dayOfWeekFilter === 'all' || assignment.dayOfWeek === dayOfWeekFilter;
        const eventMatch = eventFilter === 'all' || assignment.evento === eventMatch;
        const areaMatch = areaFilter === 'all' || assignment.area === areaFilter;
        const teamMatch = teamFilter === 'all' || assignment.equipe === teamFilter;

        return searchMatch && dayOfWeekMatch && eventMatch && areaMatch && teamMatch;
    });

  }, [currentSchedule, searchTerm, dayOfWeekFilter, eventFilter, areaFilter, teamFilter]);

  const handleDeleteClick = (schedule: SavedSchedule) => {
    setScheduleToDelete(schedule);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (scheduleToDelete) {
        await deleteSchedule(scheduleToDelete.id);
        toast({
            title: "Escala Excluída!",
            description: "A escala selecionada foi removida permanentemente.",
        });
        setIsDeleteDialogOpen(false);
        setScheduleToDelete(null);
    }
  };
  
  const handleConfirmNotifyEmail = async () => {
    if (!currentSchedule) return;

    setIsNotifying(true);
    try {
        const result = await notifyVolunteersByEmail(currentSchedule);
        if (result.success) {
            toast({
                title: "Notificações Enviadas!",
                description: `${result.sentCount} voluntários foram notificados por e-mail.`
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao Notificar por E-mail",
            description: error.message
        });
    } finally {
        setIsNotifying(false);
        setIsNotifyEmailDialogOpen(false);
    }
  };

  const handleConfirmNotifyWhatsApp = async () => {
    if (!currentSchedule) return;

    setIsNotifying(true);
    try {
      const result = await notifyVolunteersByWhatsApp(currentSchedule);
      if (result.success) {
        toast({
          title: "Notificações Enviadas!",
          description: `${result.sentCount} voluntários foram notificados por WhatsApp.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Notificar por WhatsApp",
        description: error.message,
      });
    } finally {
      setIsNotifying(false);
      setIsNotifyWhatsAppDialogOpen(false);
    }
  };
  
  const canManage = permissions?.canGenerateSchedules ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Escalas Salvas</h1>
        <p className="text-muted-foreground">Consulte e edite as escalas unificadas para um mês e ano específicos.</p>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Filtrar Período</CardTitle>
          <CardDescription>
            Selecione o mês e o ano para visualizar a escala consolidada.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="month-select" className="text-sm font-medium">Mês</label>
            <Select value={month} onValueChange={setMonth}>
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
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year-select">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Detalhes da Escala para {monthLabel} de {year}</CardTitle>
                <CardDescription>Filtre, visualize e edite as atribuições abaixo.</CardDescription>
              </div>
               {currentSchedule && canManage && (
                 <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Bell className="mr-2 h-4 w-4" />
                          Notificações
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsNotifyEmailDialogOpen(true)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Notificar por E-mail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsNotifyWhatsAppDialogOpen(true)}>
                          <Bot className="mr-2 h-4 w-4" />
                          Notificar por WhatsApp
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(currentSchedule)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir Escala
                    </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-2 mt-4 flex-wrap">
               <div className="relative w-full md:flex-1 min-w-[200px]">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input
                    type="search"
                    placeholder="Buscar por evento, área, voluntário..."
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
                  <TableHead>Dia</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Voluntário / Motivo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => {
                    const eligibleVolunteers = volunteers
                        .filter(v => v.areas.includes(assignment.area))
                        .sort((a,b) => a.name.localeCompare(b.name));
                    const assignmentIdentifier = `${assignment.evento}-${assignment.area}-${assignment.voluntario_alocado || 'null'}-${assignment.assignmentIndex}`;
                    const teamColor = assignment.equipe ? generateColorFromString(assignment.equipe) : null;
                    const eventColor = generateColorFromString(assignment.evento);
                    
                    return(
                    <TableRow key={`${assignment.fullDate}-${assignmentIdentifier}`}>
                      <TableCell data-label="Data">{new Date(assignment.fullDate + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                      <TableCell data-label="Dia">{assignment.dayOfWeek}</TableCell>
                      <TableCell data-label="Evento">
                          <Badge style={{ backgroundColor: eventColor.bgColor, color: eventColor.textColor }} variant="outline">{assignment.evento}</Badge>
                      </TableCell>
                      <TableCell data-label="Área">{assignment.area}</TableCell>
                      <TableCell data-label="Equipe">
                        {assignment.equipe && teamColor && <Badge style={{ backgroundColor: teamColor.bgColor, color: teamColor.textColor }} variant="secondary">{assignment.equipe}</Badge>}
                      </TableCell>
                      <TableCell data-label="Voluntário">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="ghost" className="h-auto p-1 text-right md:text-left font-normal -ml-2 w-full justify-end md:justify-start" disabled={!canManage}>
                              {assignment.voluntario_alocado ? (
                                  <span>{assignment.voluntario_alocado}</span>
                              ) : (
                                  <span className="text-muted-foreground italic">{assignment.motivo || 'Atribuir...'}</span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                             <DropdownMenuItem onClick={() => handleAssignmentChange(assignment.scheduleId, assignment.fullDate, assignmentIdentifier, '')}>
                                -- Nenhum --
                            </DropdownMenuItem>
                            {eligibleVolunteers.length > 0 ? (
                              eligibleVolunteers.map(v => (
                                <DropdownMenuItem 
                                    key={v.id} 
                                    onClick={() => handleAssignmentChange(assignment.scheduleId, assignment.fullDate, assignmentIdentifier, v.id)}
                                    disabled={v.name === assignment.voluntario_alocado}
                                >
                                  {v.name}
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled>Nenhum voluntário para esta área</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell data-label="Status">
                         <Badge variant={assignment.status === 'Preenchida' ? 'default' : 'destructive'}>
                          {assignment.status}
                         </Badge>
                      </TableCell>
                    </TableRow>
                  )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                       {currentSchedule ? "Nenhum agendamento encontrado para os filtros aplicados." : "Nenhuma escala salva encontrada para este mês e ano."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a escala de {' '}
              {scheduleToDelete ? `${months.find(m => m.value === String(scheduleToDelete.month))?.label} de ${scheduleToDelete.year}` : 'selecionada'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isNotifyEmailDialogOpen} onOpenChange={setIsNotifyEmailDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Notificação por E-mail?</AlertDialogTitle>
            <AlertDialogDescription>
               {volunteersToNotifyByEmail.length > 0 ?
                `Você está prestes a enviar a escala por e-mail para ${volunteersToNotifyByEmail.length} voluntário(s) com e-mail cadastrado. Deseja continuar?` :
                "Nenhum voluntário com e-mail cadastrado foi encontrado nesta escala. Verifique os cadastros dos voluntários."
               }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNotifyEmail} disabled={isNotifying || volunteersToNotifyByEmail.length === 0}>
                {isNotifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isNotifying ? 'Enviando...' : 'Sim, Enviar E-mails'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isNotifyWhatsAppDialogOpen} onOpenChange={setIsNotifyWhatsAppDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Notificação por WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              {volunteersToNotifyByWhatsApp.length > 0
                ? `Você está prestes a enviar a escala por WhatsApp para ${volunteersToNotifyByWhatsApp.length} voluntário(s) com telefone cadastrado. Deseja continuar?`
                : "Nenhum voluntário com telefone cadastrado foi encontrado nesta escala. Verifique os cadastros dos voluntários."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNotifyWhatsApp} disabled={isNotifying || volunteersToNotifyByWhatsApp.length === 0}>
              {isNotifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNotifying ? 'Enviando...' : 'Sim, Enviar Mensagens'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
