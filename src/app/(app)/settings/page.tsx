
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';
import type { UserPermission } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { KeyRound, LockKeyhole } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const { user: currentUser, permissions: currentUserPermissions } = useAuth();
    const { userPermissions, updateUserPermission, loading } = useAppData();
    const { toast } = useToast();

    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [password, setPassword] = useState('');
    
    // An admin is someone with the canManageSettings permission.
    const isUserAdmin = currentUserPermissions?.canManageSettings ?? false;

    const handlePasswordCheck = async () => {
        const pass = password; // copy state to a local variable
        setPassword(''); // Reset password state immediately
        setIsPasswordDialogOpen(false); // Close dialog immediately

        if (pass === 'admin') {
            if (currentUser) {
                try {
                    await updateUserPermission(currentUser.uid, { canManageSettings: true });
                    toast({
                        title: 'Acesso de Administrador Concedido',
                        description: 'Você agora é um administrador do sistema.',
                    });
                } catch (error) {
                    toast({
                        variant: 'destructive',
                        title: 'Erro ao Salvar Permissão',
                        description: 'Não foi possível atualizar suas permissões de administrador.',
                    });
                }
            }
        } else {
            toast({
                variant: 'destructive',
                title: 'Senha Incorreta',
                description: 'A senha de administrador mestre está incorreta.',
            });
        }
    };

    const handlePermissionChange = async (userId: string, permissionKey: keyof Omit<UserPermission, 'id' | 'userId' | 'userDisplayName' | 'userEmail' | 'userPhotoURL'>, value: boolean) => {
        if (!isUserAdmin) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Você não tem permissão para alterar configurações.',
            });
            return;
        }

        try {
            await updateUserPermission(userId, { [permissionKey]: value });
            toast({
                title: 'Permissão Atualizada',
                description: `A permissão foi alterada com sucesso.`,
            });
        } catch (error) {
            console.error("Failed to update permission: ", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Atualizar',
                description: 'Não foi possível salvar a alteração.',
            });
        }
    };
    
    const permissionLabels: { key: keyof Omit<UserPermission, 'id' | 'userId' | 'userDisplayName' | 'userEmail' | 'userPhotoURL'>; label: string }[] = [
        { key: 'canManageVolunteers', label: 'Ger. Voluntários' },
        { key: 'canManageEvents', label: 'Ger. Eventos' },
        { key: 'canManageAreas', label: 'Ger. Áreas' },
        { key: 'canManageTeams', label: 'Ger. Equipes' },
        { key: 'canViewSchedules', label: 'Ver Escalas' },
        { key: 'canGenerateSchedules', label: 'Gerar Escalas' },
        { key: 'canManageSettings', label: 'Ger. Config' },
    ];
    
    const usersToDisplay = isUserAdmin ? userPermissions : userPermissions.filter(p => p.userId === currentUser?.uid);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
                <p className="text-muted-foreground">Gerencie as permissões de acesso e chaves de API do sistema.</p>
            </div>
            
            {isUserAdmin && (
            <Card>
                <CardHeader>
                    <CardTitle>Configurações Avançadas</CardTitle>
                    <CardDescription>
                        Gerencie chaves de API e outras configurações do sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/settings/keys">
                            <KeyRound className="mr-2 h-4 w-4" />
                            Gerenciar Chaves e Autenticação
                        </Link>
                    </Button>
                </CardContent>
            </Card>
            )}

            <Card>
                <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>Permissões de Usuário</CardTitle>
                        <CardDescription>
                            {isUserAdmin
                                ? "Controle o que cada usuário pode ver e fazer no aplicativo."
                                : "Visualize suas permissões. Apenas administradores podem alterá-las."}
                        </CardDescription>
                    </div>
                    {!isUserAdmin ? (
                        <Button onClick={() => setIsPasswordDialogOpen(true)}>
                            <LockKeyhole className="mr-2 h-4 w-4" />
                            Tornar-se Administrador
                        </Button>
                    ) : (
                        <Badge variant="default" className="text-base">Modo Administrador</Badge>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[300px]">Usuário</TableHead>
                                        {permissionLabels.map(({ label }) => <TableHead key={label} className="text-center">{label}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-10 w-10 rounded-full" />
                                                        <Skeleton className="h-4 w-32" />
                                                    </div>
                                                </TableCell>
                                                {permissionLabels.map(({ key }) => (
                                                    <TableCell key={key} className="text-center"><Skeleton className="h-6 w-11 mx-auto" /></TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        usersToDisplay.map((permission) => (
                                            <TableRow key={permission.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={permission.userPhotoURL ?? ''} alt={permission.userDisplayName ?? ''} />
                                                            <AvatarFallback>{permission.userDisplayName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <span className="font-medium">{permission.userDisplayName}</span>
                                                            <p className="text-xs text-muted-foreground">{permission.userEmail}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                {permissionLabels.map(({ key }) => (
                                                    <TableCell key={key} className="text-center">
                                                        <div className="flex justify-center">
                                                            <Switch
                                                                id={`${permission.id}-${key}`}
                                                                checked={permission[key]}
                                                                onCheckedChange={(value) => handlePermissionChange(permission.id, key, value)}
                                                                disabled={!isUserAdmin || (key === 'canManageSettings' && permission.userId === currentUser?.uid)}
                                                                aria-readonly={!isUserAdmin}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="block md:hidden">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="p-4 border-b">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                        <div className="space-y-2">
                                            {permissionLabels.map(({key}) => <Skeleton key={key} className="h-6 w-full" />)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                usersToDisplay.map((permission) => (
                                    <div key={permission.id} className="p-4 border-b">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar>
                                                <AvatarImage src={permission.userPhotoURL ?? ''} alt={permission.userDisplayName ?? ''} />
                                                <AvatarFallback>{permission.userDisplayName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <span className="font-medium">{permission.userDisplayName}</span>
                                                <p className="text-xs text-muted-foreground">{permission.userEmail}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {permissionLabels.map(({key, label}) => (
                                                <div key={key} className="flex justify-between items-center">
                                                    <label htmlFor={`${permission.id}-${key}-mobile`} className="text-sm">{label}</label>
                                                    <Switch
                                                        id={`${permission.id}-${key}-mobile`}
                                                        checked={permission[key]}
                                                        onCheckedChange={(value) => handlePermissionChange(permission.id, key, value)}
                                                        disabled={!isUserAdmin || (key === 'canManageSettings' && permission.userId === currentUser?.uid)}
                                                        aria-readonly={!isUserAdmin}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                     {!loading && userPermissions.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            Nenhum usuário encontrado. Novos usuários aparecerão aqui após o primeiro login.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tornar-se Administrador</DialogTitle>
                        <DialogDescription>
                            Digite a senha mestre para ganhar permissões de administrador. Esta ação é permanente para sua conta.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            id="master-password"
                            type="password"
                            placeholder="Senha mestre"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button type="button" onClick={handlePasswordCheck}>Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
