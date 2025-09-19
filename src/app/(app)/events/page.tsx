"use client"

import React, { useState } from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/hooks/use-auth';

const eventAreaSchema = z.object({
  name: z.string(),
  volunteersNeeded: z.coerce.number().min(1, "Deve ser no mínimo 1").default(1),
});

const eventSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  frequency: z.enum(['Semanal', 'Pontual']),
  dayOfWeek: z.string().optional(),
  date: z.string().optional(),
  time: z.string().min(1, "Horário é obrigatório"),
  areas: z.array(eventAreaSchema).min(1, "Selecione ao menos uma área"),
  responsible: z.string().optional(),
  contact: z.string().optional(),
  observations: z.string().optional(),
}).refine(data => {
    if (data.frequency === 'Semanal') return !!data.dayOfWeek;
    return true;
}, {
    message: "Dia da semana é obrigatório para eventos semanais",
    path: ["dayOfWeek"],
}).refine(data => {
    if (data.frequency === 'Pontual') return !!data.date;
    return true;
}, {
    message: "Data é obrigatória para eventos pontuais",
    path: ["date"],
});


const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export default function EventsPage() {
  const { events, areasOfService, addEvent, updateEvent, deleteEvent } = useAppData();
  const { permissions } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: { name: '', frequency: 'Semanal', time: '', areas: [], responsible: '', contact: '', observations: '' },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "areas"
  });

  const frequency = form.watch('frequency');
  const selectedAreas = form.watch('areas');

  function handleAdd() {
    setSelectedEvent(null);
    form.reset({ name: '', frequency: 'Semanal', time: '', areas: [], responsible: '', contact: '', observations: '' });
    setIsDialogOpen(true);
  }

  function handleEdit(event: Event) {
    setSelectedEvent(event);
    const eventDate = event.date ? format(parseISO(event.date+'T00:00:00'), 'yyyy-MM-dd') : undefined;
    form.reset({...event, date: eventDate});
    setIsDialogOpen(true);
  }
  
  function handleDuplicate(event: Event) {
    setSelectedEvent(null); // It's a new event, so no selectedEvent
    const eventDate = event.date ? format(parseISO(event.date+'T00:00:00'), 'yyyy-MM-dd') : undefined;
    const newEventData = {
        ...event,
        name: `${event.name} (Cópia)`,
        id: undefined, // ensure it's treated as a new event
        date: eventDate,
    };
    delete (newEventData as any).id;
    form.reset(newEventData);
    setIsDialogOpen(true);
  }


  function handleDelete(event: Event) {
    setSelectedEvent(event);
    setIsDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (selectedEvent) {
        await deleteEvent(selectedEvent.id);
        toast({
            title: "Sucesso!",
            description: "Evento excluído.",
        });
        setIsDeleteDialogOpen(false);
        setSelectedEvent(null);
    }
  }


  async function onSubmit(data: z.infer<typeof eventSchema>) {
    const formattedData: { [key: string]: any } = { ...data };

    Object.keys(formattedData).forEach(key => {
        if (formattedData[key] === undefined) {
            delete formattedData[key];
        }
        if (formattedData[key] === '') {
            formattedData[key] = null;
        }
    });

    if (data.frequency === 'Pontual' && data.date) {
        formattedData.date = format(new Date(data.date + 'T00:00:00Z'), 'yyyy-MM-dd');
        delete formattedData.dayOfWeek;
    } else if (data.frequency === 'Semanal') {
        delete formattedData.date;
    }

    try {
      if (selectedEvent) {
          await updateEvent(selectedEvent.id, formattedData as Partial<Event>);
           toast({
              title: "Sucesso!",
              description: "Evento atualizado.",
              className: "bg-primary text-primary-foreground",
          });
      } else {
          await addEvent(formattedData as Omit<Event, 'id'>);
           toast({
              title: "Sucesso!",
              description: "Novo evento adicionado.",
              className: "bg-primary text-primary-foreground",
          });
      }

      setIsDialogOpen(false);
      setSelectedEvent(null);
      form.reset();
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o evento. Tente novamente.",
      });
    }
  }
  
  const handleSelectAllAreas = (checked: boolean) => {
    if (checked) {
      const allAreaNames = areasOfService.map(a => a.name);
      const currentAreaNames = selectedAreas.map(a => a.name);
      const newAreas = allAreaNames.filter(name => !currentAreaNames.includes(name));
      newAreas.forEach(name => append({ name, volunteersNeeded: 1 }));
    } else {
      remove(); // removes all
    }
  };
  
  const handleAreaCheckedChange = (checked: boolean, areaName: string) => {
    const areaIndex = selectedAreas.findIndex(a => a.name === areaName);
    if (checked) {
      if (areaIndex === -1) {
        append({ name: areaName, volunteersNeeded: 1 });
      }
    } else {
      if (areaIndex !== -1) {
        remove(areaIndex);
      }
    }
  };
  
  const canManage = permissions?.canManageEvents ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gerenciar Eventos</h1>
        <p className="text-muted-foreground">Adicione, visualize e gerencie os eventos fixos e pontuais.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Lista de Eventos</CardTitle>
            <CardDescription>Todos os eventos cadastrados no sistema.</CardDescription>
          </div>
          <Button onClick={handleAdd} disabled={!canManage}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Evento
          </Button>
        </CardHeader>
        <CardContent>
          <Table className="responsive-table">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Áreas de Serviço</TableHead>
                 <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell data-label="Nome" className="font-medium">{event.name}</TableCell>
                  <TableCell data-label="Frequência"><Badge variant={event.frequency === 'Semanal' ? 'default' : 'secondary'}>{event.frequency}</Badge></TableCell>
                  <TableCell data-label="Detalhes">
                    {event.frequency === 'Semanal' ? event.dayOfWeek : event.date ? format(new Date(event.date+'T12:00:00Z'), 'dd/MM/yyyy') : ''} às {event.time}
                  </TableCell>
                  <TableCell data-label="Áreas">
                    <div className="flex flex-wrap gap-1 max-w-sm justify-end md:justify-start">
                      {event.areas.map(area => 
                        <Badge key={area.name} variant="outline">
                          {area.name} ({area.volunteersNeeded})
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                   <TableCell className="text-right actions-cell">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={!canManage}>
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(event)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleDuplicate(event)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(event)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Editar Evento' : 'Adicionar Novo Evento'}</DialogTitle>
            <DialogDescription>Preencha os dados do evento.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto pr-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Evento</FormLabel>
                        <FormControl><Input placeholder="Ex: Culto de Domingo" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="time" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="frequency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione a frequência" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Semanal">Semanal</SelectItem>
                            <SelectItem value="Pontual">Pontual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {frequency === 'Semanal' && (
                      <FormField control={form.control} name="dayOfWeek" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia da Semana</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione o dia" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                    {frequency === 'Pontual' && (
                      <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>
                  
                    <FormItem>
                        <div className="mb-4 flex items-center justify-between">
                            <FormLabel>Áreas de Serviço Necessárias</FormLabel>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="select-all-areas"
                                checked={selectedAreas?.length === areasOfService.length && areasOfService.length > 0}
                                onCheckedChange={(checked) => handleSelectAllAreas(checked as boolean)}
                              />
                              <label htmlFor="select-all-areas" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Selecionar Todas
                              </label>
                            </div>
                        </div>
                        <div className="space-y-2 p-2 border rounded-md max-h-60 overflow-y-auto">
                        {areasOfService.map((area) => {
                          const areaIndex = selectedAreas.findIndex(a => a.name === area.name);
                          const isChecked = areaIndex !== -1;
                          return (
                            <div key={area.name} className="flex items-center justify-between">
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                    <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => handleAreaCheckedChange(checked as boolean, area.name)}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">{area.name}</FormLabel>
                                </FormItem>
                                {isChecked && (
                                    <FormField
                                      control={form.control}
                                      name={`areas.${areaIndex}.volunteersNeeded`}
                                      render={({ field }) => (
                                          <FormItem className="w-24">
                                            <FormControl>
                                                <Input type="number" min={1} {...field} />
                                            </FormControl>
                                            <FormMessage/>
                                          </FormItem>
                                      )}
                                    />
                                )}
                            </div>
                          )
                        })}
                        </div>
                        <FormMessage />
                    </FormItem>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="responsible" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <FormControl><Input placeholder="Nome do responsável" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="contact" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contato</FormLabel>
                          <FormControl><Input placeholder="Telefone ou email" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                  </div>
                  
                  <FormField control={form.control} name="observations" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl><Textarea placeholder="Alguma observação sobre o evento?" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
              </div>
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o evento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
