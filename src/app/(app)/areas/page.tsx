"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { AreaOfService } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/hooks/use-auth';


const areaSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  leader: z.string().optional(),
  leaderPhone: z.string().optional(),
});

export default function AreasPage() {
  const { areasOfService, addArea, updateArea, deleteArea } = useAppData();
  const { permissions } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaOfService | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof areaSchema>>({
    resolver: zodResolver(areaSchema),
    defaultValues: { name: '', leader: '', leaderPhone: '' },
  });

  function handleAdd() {
    setSelectedArea(null);
    form.reset({ name: '', leader: '', leaderPhone: '' });
    setIsDialogOpen(true);
  }

  function handleEdit(area: AreaOfService) {
    setSelectedArea(area);
    form.reset(area);
    setIsDialogOpen(true);
  }

  function handleDelete(area: AreaOfService) {
    setSelectedArea(area);
    setIsDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (selectedArea) {
      try {
        await deleteArea(selectedArea.id);
        toast({
          title: "Sucesso!",
          description: "Área de serviço excluída.",
        });
      } catch (error: any) {
         toast({
          variant: "destructive",
          title: "Erro ao excluir",
          description: error.message,
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setSelectedArea(null);
      }
    }
  }

  async function onSubmit(data: z.infer<typeof areaSchema>) {
    try {
      if (selectedArea) {
        // Edit
        await updateArea(selectedArea.id, data);
         toast({
          title: "Sucesso!",
          description: "Área de serviço atualizada.",
          className: "bg-primary text-primary-foreground",
        });
      } else {
        // Add
        await addArea(data);
         toast({
          title: "Sucesso!",
          description: "Nova área de serviço adicionada.",
          className: "bg-primary text-primary-foreground",
        });
      }
      setIsDialogOpen(false);
      setSelectedArea(null);
      form.reset();
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    }
  }
  
  const canManage = permissions?.canManageAreas ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gerenciar Áreas de Serviço</h1>
        <p className="text-muted-foreground">Adicione, visualize e gerencie as áreas de serviço.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Lista de Áreas de Serviço</CardTitle>
            <CardDescription>Todas as áreas de serviço cadastradas no sistema.</CardDescription>
          </div>
          <Button onClick={handleAdd} disabled={!canManage}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Área
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table className="responsive-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Contato do Líder</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areasOfService.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell data-label="Nome" className="font-medium">
                      {area.name}
                    </TableCell>
                    <TableCell data-label="Líder">{area.leader || '-'}</TableCell>
                    <TableCell data-label="Contato">{area.leaderPhone || '-'}</TableCell>
                    <TableCell className="text-right actions-cell">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={!canManage}>
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(area)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(area)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedArea ? 'Editar Área' : 'Adicionar Nova Área'}</DialogTitle>
            <DialogDescription>Preencha os dados da área.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto pr-6 space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Área</FormLabel>
                    <FormControl><Input placeholder="Ex: Multimídia" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="leader" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Líder</FormLabel>
                    <FormControl><Input placeholder="Nome do responsável" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="leaderPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato do Líder</FormLabel>
                    <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl>
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
              Essa ação não pode ser desfeita. Isso excluirá permanentemente a área de serviço.
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
