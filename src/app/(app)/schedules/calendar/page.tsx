"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppData } from '@/context/AppDataContext';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function TeamCalendarPage() {
  const { teams, teamSchedules, generateTeamSchedules } = useAppData();
  const { permissions } = useAuth();
  const { toast } = useToast();

  const [year, setYear] = useState<string>(() => getYear(new Date()).toString());
  const [month, setMonth] = useState<string>(() => (getMonth(new Date()) + 1).toString());
  const [startTeam, setStartTeam] = useState<string>(() => teams[0]?.name || '');

  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }) }));

  const sortedSchedules = useMemo(() => {
    return [...teamSchedules]
      .filter(s => s.year === parseInt(year) && s.month === parseInt(month))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [teamSchedules, year, month]);

  // Update startTeam when teams data loads
  React.useEffect(() => {
    if (teams.length > 0 && !startTeam) {
      setStartTeam(teams[0].name);
    }
  }, [teams, startTeam]);
  
  const handleUpdateRotation = async () => {
    if (!startTeam) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhuma equipe inicial selecionada. Cadastre equipes primeiro."
      });
      return;
    }
    await generateTeamSchedules(parseInt(year), parseInt(month), startTeam);
    toast({
        title: "Rotação Atualizada!",
        description: `A rotação para ${months.find(m => m.value === month)?.label}/${year} foi gerada começando com a equipe ${startTeam}.`
    });
  };

  const formatWeek = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const startDay = format(start, 'dd');
    const endDay = format(end, 'dd');
    const monthName = format(start, 'MMMM', { locale: ptBR });
    const yearNum = format(start, 'yyyy');
    
    return `${startDay} a ${endDay} de ${monthName} de ${yearNum}`;
  }
  
  const canManage = permissions?.canGenerateSchedules ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Calendário de Rotação de Equipes</h1>
        <p className="text-muted-foreground">Configure e consulte a escala de responsabilidade semanal de cada equipe.</p>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>Configurar Rotação</CardTitle>
          <CardDescription>
            Defina o ponto de partida para a rotação das equipes para um mês e ano específicos.
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
            <label htmlFor="team-select" className="text-sm font-medium">Equipe Inicial</label>
            <Select value={startTeam} onValueChange={setStartTeam} disabled={teams.length === 0 || !canManage}>
              <SelectTrigger id="team-select">
                <SelectValue placeholder="Selecione a equipe" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleUpdateRotation} className="w-full sm:w-auto" disabled={!canManage}>
              Gerar / Atualizar Rotação
            </Button>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Cronograma de Equipes para {months.find(m=>m.value===month)?.label} de {year}</CardTitle>
          <CardDescription>
            Cada equipe é responsável por todos os eventos que ocorrem na sua semana designada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Período de Responsabilidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSchedules.length > 0 ? sortedSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <Badge variant="default" className="text-base px-3 py-1">{schedule.team}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-lg">
                        {formatWeek(schedule.startDate, schedule.endDate)}
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center">
                            Nenhum cronograma definido para este mês. Use o formulário acima para gerar a rotação.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
