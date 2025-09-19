"use client"

import React, { useState, useRef } from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Volunteer } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAppData } from '@/context/AppDataContext';
import { Skeleton } from '@/components/ui/skeleton';
import Papa from 'papaparse';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from '@/hooks/use-auth';

const volunteerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  team: z.string().min(1, "Equipe é obrigatória"),
  areas: z.array(z.string()).min(1, "Selecione ao menos uma área"),
  availability: z.array(z.string()),
  phone: z.string().optional(),
  email: z.string().email({ message: "Email inválido" }).optional().or(z.literal('')),
});

export default function VolunteersPage() {
  const { volunteers, teams, areasOfService, events, updateVolunteer, addVolunteer, deleteVolunteer, loading } = useAppData();
  const { permissions } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof volunteerSchema>>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: { name: '', team: '', areas: [], availability: [], phone: '', email: '' },
  });

  const availabilityItems = React.useMemo(() => Array.from(new Set(events.map(e => e.name))), [events]);
  const allTeams = React.useMemo(() => [...teams.map(t => t.name), "N/A"], [teams]);
  
  function handleAdd() {
    setSelectedVolunteer(null);
    form.reset({ name: '', team: 'N/A', areas: [], availability: [], phone: '', email: '' });
    setIsDialogOpen(true);
  }

  function handleEdit(volunteer: Volunteer) {
    setSelectedVolunteer(volunteer);
    form.reset(volunteer);
    setIsDialogOpen(true);
  }

  function handleDelete(volunteer: Volunteer) {
    setSelectedVolunteer(volunteer);
    setIsDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (selectedVolunteer) {
        await deleteVolunteer(selectedVolunteer.id);
        toast({
            title: "Sucesso!",
            description: "Voluntário excluído.",
        });
        setIsDeleteDialogOpen(false);
        setSelectedVolunteer(null);
    }
  }

  async function handleTeamChange(volunteerId: string, newTeam: string) {
    const volunteer = volunteers.find(v => v.id === volunteerId);
    if (volunteer) {
        await updateVolunteer(volunteer.id, { ...volunteer, team: newTeam });
        toast({
            title: "Equipe Atualizada",
            description: `${volunteer.name} agora está na equipe ${newTeam}.`
        });
    }
  }


  async function onSubmit(data: z.infer<typeof volunteerSchema>) {
    const volunteerData = {
        name: data.name,
        team: data.team,
        areas: data.areas,
        availability: data.availability,
        phone: data.phone,
        email: data.email,
    };

    if (selectedVolunteer) {
        // Edit
        await updateVolunteer(selectedVolunteer.id, volunteerData);
        toast({
            title: "Sucesso!",
            description: "Voluntário atualizado.",
            className: "bg-primary text-primary-foreground",
        });
    } else {
        // Add
        await addVolunteer(volunteerData);
        toast({
            title: "Sucesso!",
            description: "Novo voluntário adicionado.",
            className: "bg-primary text-primary-foreground",
        });
    }
    
    setIsDialogOpen(false);
    setSelectedVolunteer(null);
    form.reset();
  }
  
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Voluntários');

    // Define columns and headers
    worksheet.columns = [
      { header: 'name', key: 'name', width: 30 },
      { header: 'team', key: 'team', width: 20 },
      { header: 'phone', key: 'phone', width: 20 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'areas', key: 'areas', width: 40 },
      { header: 'availability', key: 'availability', width: 40 },
    ];
    
    const teamNames = allTeams.join(',');
    const areaNames = `"${areasOfService.map(a => a.name).join(',')}"`;
    const availabilityNames = `"${availabilityItems.join(',')}"`;

    // Apply data validation for 1000 rows
    for (let i = 2; i <= 1001; i++) {
        worksheet.getCell(`B${i}`).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: [`"${teamNames}"`],
            showErrorMessage: true,
            errorTitle: 'Equipe Inválida',
            error: 'Por favor, selecione uma equipe da lista.',
        };
        worksheet.getCell(`E${i}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [areaNames],
             showErrorMessage: true,
            errorTitle: 'Área Inválida',
            error: 'Para múltiplas áreas, separe por vírgula. Ex: Som,Mídia',
        };
        worksheet.getCell(`F${i}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [availabilityNames],
            showErrorMessage: true,
            errorTitle: 'Disponibilidade Inválida',
            error: 'Para múltiplas disponibilidades, separe por vírgula. Ex: Culto A,Culto B',
        };
    }

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' } // light gray
        };
        cell.border = {
            bottom: { style: 'thin' }
        };
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    saveAs(blob, 'modelo_voluntarios.xlsx');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const existingVolunteerNames = new Set(volunteers.map(v => v.name.toLowerCase()));
            let newVolunteersCount = 0;
            
            const parsedVolunteers = results.data.map((row: any) => ({
                name: row.name?.trim() || '',
                team: row.team?.trim() || 'N/A',
                phone: row.phone?.trim() || '',
                email: row.email?.trim() || '',
                areas: row.areas ? row.areas.split(',').map((s:string) => s.trim()) : [],
                availability: row.availability ? row.availability.split(',').map((s:string) => s.trim()) : [],
            }));
            
            const volunteersToAdd = parsedVolunteers.filter(v => 
                v.name && !existingVolunteerNames.has(v.name.toLowerCase())
            );

            if (volunteersToAdd.length === 0) {
                 toast({
                    title: "Nenhum novo voluntário",
                    description: "Todos os voluntários no arquivo já existem no sistema."
                });
                return;
            }

            try {
              for (const v of volunteersToAdd) {
                  await addVolunteer(v);
                  newVolunteersCount++;
              }
              toast({
                  title: "Importação Concluída!",
                  description: `${newVolunteersCount} novos voluntários foram adicionados. ${parsedVolunteers.length - newVolunteersCount} já existiam.`
              });
            } catch (error: any) {
               toast({
                variant: 'destructive',
                title: 'Erro na Importação',
                description: `Ocorreu um erro ao salvar os voluntários: ${error.message}`
            });
            }
        },
        error: (error) => {
            toast({
                variant: 'destructive',
                title: 'Erro na Importação',
                description: `Ocorreu um erro ao ler o arquivo: ${error.message}`
            });
        }
    });

    // Reset file input
    if(event.target) {
        event.target.value = '';
    }
  };


  const filteredVolunteers = volunteers.filter(volunteer => {
    const nameMatch = volunteer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const teamMatch = teamFilter === 'all' || volunteer.team === teamFilter;
    const areaMatch = areaFilter === 'all' || volunteer.areas.includes(areaFilter);
    const availabilityMatch = availabilityFilter === 'all' || volunteer.availability.includes(availabilityFilter);
    return nameMatch && teamMatch && areaMatch && availabilityMatch;
  });
  
  const canManage = permissions?.canManageVolunteers ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gerenciar Voluntários</h1>
        <p className="text-muted-foreground">Adicione, visualize e gerencie os voluntários.</p>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div>
                    <CardTitle>Lista de Voluntários</CardTitle>
                    <CardDescription>Todos os voluntários cadastrados no sistema.</CardDescription>
                </div>
                <div className="flex flex-col-reverse sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input
                            type="search"
                            placeholder="Buscar por nome..."
                            className="pl-8 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex w-full sm:w-auto items-center gap-2">
                      <Button onClick={handleAdd} className="w-full sm:w-auto" disabled={!canManage}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Adicionar
                      </Button>
                      <Button variant="outline" onClick={handleImportClick} disabled={!canManage}>
                          <Upload className="mr-2 h-4 w-4" />
                          Importar
                      </Button>
                       <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileImport}
                       />
                      <Button variant="outline" onClick={handleDownloadTemplate}>
                          <Download className="mr-2 h-4 w-4" />
                          Modelo
                      </Button>
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mt-4 flex-wrap">
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="Filtrar por Equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Equipes</SelectItem>
                  {allTeams.map(teamName => <SelectItem key={teamName} value={teamName}>{teamName}</SelectItem>)}
                </SelectContent>
              </Select>
               <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="Filtrar por Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  {areasOfService.map(area => <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>)}
                </SelectContent>
              </Select>
               <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="Disponibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {availabilityItems.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
        </CardHeader>
        <CardContent>
          <Table className="responsive-table">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Áreas de Serviço</TableHead>
                <TableHead>Disponibilidade</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredVolunteers.length > 0 ? filteredVolunteers.map((volunteer) => (
                <TableRow key={volunteer.id}>
                  <TableCell data-label="Nome" className="font-medium">{volunteer.name}</TableCell>
                  <TableCell data-label="Equipe">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-auto p-1 text-left font-normal -mx-2" disabled={!canManage}>
                          <Badge variant={volunteer.team === 'N/A' ? 'outline' : 'default'} className="cursor-pointer">
                            {volunteer.team}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {allTeams.map(teamName => (
                           <DropdownMenuItem 
                              key={teamName} 
                              onClick={() => handleTeamChange(volunteer.id, teamName)}
                              disabled={volunteer.team === teamName}
                            >
                            {teamName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell data-label="Áreas">
                    <div className="flex flex-wrap justify-end md:justify-start gap-1 max-w-xs">
                      {volunteer.areas.map(area => <Badge key={area} variant="secondary">{area}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell data-label="Disponibilidade">
                    <div className="flex flex-wrap justify-end md:justify-start gap-1 max-w-xs">
                      {volunteer.availability.map(avail => <Badge key={avail} variant="outline">{avail}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell data-label="Contato">
                    <div className="text-sm text-right md:text-left">
                      <div>{volunteer.email}</div>
                      <div>{volunteer.phone}</div>
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
                        <DropdownMenuItem onClick={() => handleEdit(volunteer)}>
                           <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(volunteer)} className="text-destructive">
                           <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum voluntário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedVolunteer ? 'Editar Voluntário' : 'Adicionar Novo Voluntário'}</DialogTitle>
            <DialogDescription>Preencha os dados do voluntário.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto pr-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl><Input placeholder="Nome do voluntário" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="team" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipe</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma equipe" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {allTeams.map(team => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Celular</FormLabel>
                          <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField control={form.control} name="areas" render={() => (
                      <FormItem>
                          <FormLabel>Áreas de Serviço</FormLabel>
                          <div className="space-y-2 p-2 border rounded-md max-h-40 overflow-y-auto">
                          {areasOfService.map((area) => (
                              <FormField key={area.id} control={form.control} name="areas" render={({ field }) => (
                              <FormItem key={area.id} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                  <Checkbox
                                      checked={field.value?.includes(area.name)}
                                      onCheckedChange={(checked) => {
                                      return checked
                                          ? field.onChange([...(field.value || []), area.name])
                                          : field.onChange(field.value?.filter((value) => value !== area.name));
                                      }}
                                  />
                                  </FormControl>
                                  <FormLabel className="font-normal">{area.name}</FormLabel>
                              </FormItem>
                              )} />
                          ))}
                          </div>
                          <FormMessage />
                      </FormItem>
                  )} />
                   <FormField control={form.control} name="availability" render={() => (
                      <FormItem>
                          <FormLabel>Disponibilidade</FormLabel>
                           <div className="space-y-2 p-2 border rounded-md max-h-40 overflow-y-auto">
                          {availabilityItems.map((item) => (
                               <FormField key={item} control={form.control} name="availability" render={({ field }) => (
                              <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                  <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                      return checked
                                          ? field.onChange([...(field.value || []), item])
                                          : field.onChange(field.value?.filter((value) => value !== item));
                                      }}
                                  />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item}</FormLabel>
                              </FormItem>
                              )} />
                          ))}
                          </div>
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>
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
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o voluntário.
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
