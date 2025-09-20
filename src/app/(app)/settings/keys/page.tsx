
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SecretsSchema, type Secrets } from '@/lib/types';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, Send, Loader2 } from "lucide-react"
import { Separator } from '@/components/ui/separator';

export default function KeysPage() {
    const { permissions, loading: authLoading } = useAuth();
    const { secrets, saveSecrets, loading: dataLoading, sendTestEmail, sendTestWhatsApp } = useAppData();
    const router = useRouter();
    const { toast } = useToast();

    const [testEmailRecipient, setTestEmailRecipient] = useState('');
    const [testPhone, setTestPhone] = useState('');
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);

    const form = useForm<Secrets>({
        resolver: zodResolver(SecretsSchema),
        defaultValues: {
            TWILIO_ACCOUNT_SID: '',
            TWILIO_AUTH_TOKEN: '',
            TWILIO_WHATSAPP_NUMBER: '',
            EMAIL_HOST: '',
            EMAIL_PORT: '',
            EMAIL_USER: '',
            EMAIL_PASS: '',
            EMAIL_FROM: '',
        },
    });

    const isLoading = authLoading || dataLoading;
    const isUserAdmin = permissions?.canManageSettings ?? false;

    useEffect(() => {
        if (!isLoading && !isUserAdmin) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Você não tem permissão para acessar esta página.',
            });
            router.push('/settings');
        }
    }, [isLoading, isUserAdmin, router, toast]);

    useEffect(() => {
        if (secrets) {
            form.reset(secrets);
        }
    }, [secrets, form]);

    const onSubmit = async (data: Secrets) => {
        try {
            await saveSecrets(data);
            toast({
                title: 'Sucesso!',
                description: 'As chaves de API e autenticação foram salvas com segurança.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar as chaves. Tente novamente.',
            });
        }
    };

    const handleSendTestEmail = async () => {
        if (!testEmailRecipient) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira um e-mail de destino.' });
            return;
        }
        setIsTestingEmail(true);
        const currentSecrets = form.getValues();
        try {
            const result = await sendTestEmail({
              recipient: testEmailRecipient, 
              secrets: {
                EMAIL_HOST: currentSecrets.EMAIL_HOST || '',
                EMAIL_PORT: currentSecrets.EMAIL_PORT || '',
                EMAIL_USER: currentSecrets.EMAIL_USER || '',
                EMAIL_PASS: currentSecrets.EMAIL_PASS || '',
                EMAIL_FROM: currentSecrets.EMAIL_FROM || '',
              }
            });
            if (result.success) {
                toast({ title: 'Sucesso!', description: `E-mail de teste enviado para ${testEmailRecipient}.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Falha no Envio do E-mail', description: error.message });
        } finally {
            setIsTestingEmail(false);
        }
    };

    const handleSendTestWhatsApp = async () => {
        if (!testPhone) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira um telefone de destino.' });
            return;
        }
        setIsTestingWhatsApp(true);
        const currentSecrets = form.getValues();
        try {
             const result = await sendTestWhatsApp({
                recipient: testPhone, 
                secrets: {
                  TWILIO_ACCOUNT_SID: currentSecrets.TWILIO_ACCOUNT_SID || '',
                  TWILIO_AUTH_TOKEN: currentSecrets.TWILIO_AUTH_TOKEN || '',
                  TWILIO_WHATSAPP_NUMBER: currentSecrets.TWILIO_WHATSAPP_NUMBER || '',
                }
              });
             if (result.success) {
                toast({ title: 'Sucesso!', description: `Mensagem de teste enviada para ${testPhone}.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Falha no Envio do WhatsApp', description: error.message });
        } finally {
            setIsTestingWhatsApp(false);
        }
    };

    if (isLoading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-6 w-1/2" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
             </div>
        )
    }
    
    if (!isUserAdmin) {
        return null;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Chaves de API e Autenticação</h1>
                <p className="text-muted-foreground">Gerencie as credenciais para serviços externos como Twilio e envio de e-mail.</p>
            </div>
            
             <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Configuração Segura</AlertTitle>
              <AlertDescription>
                As chaves salvas aqui são armazenadas de forma segura no Firestore e acessadas apenas pelo servidor. Elas nunca são expostas no navegador do usuário.
              </AlertDescription>
            </Alert>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Twilio (WhatsApp)</CardTitle>
                            <CardDescription>Credenciais necessárias para enviar notificações via WhatsApp (API Oficial).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="TWILIO_ACCOUNT_SID" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account SID</FormLabel>
                                    <FormControl><Input placeholder="AC..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="TWILIO_AUTH_TOKEN" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Auth Token</FormLabel>
                                    <FormControl><Input type="password" placeholder="Seu token de autenticação" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="TWILIO_WHATSAPP_NUMBER" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número do WhatsApp (Remetente)</FormLabel>
                                    <FormControl><Input placeholder="whatsapp:+14155238886" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Separator className="my-6" />
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Testar Envio de WhatsApp</h3>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        placeholder="Telefone de destino (ex: 5511999998888)"
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="button" variant="secondary" onClick={handleSendTestWhatsApp} disabled={isTestingWhatsApp}>
                                        {isTestingWhatsApp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Enviar Teste
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Servidor de E-mail (SMTP)</CardTitle>
                            <CardDescription>Credenciais para o servidor que enviará os e-mails de notificação e lembrete.</CardDescription>
                        </Header>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="EMAIL_HOST" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Host SMTP</FormLabel>
                                        <FormControl><Input placeholder="smtp.example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="EMAIL_PORT" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Porta</FormLabel>
                                        <FormControl><Input type="number" placeholder="587" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="EMAIL_USER" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Usuário</FormLabel>
                                        <FormControl><Input placeholder="seu_usuario" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="EMAIL_PASS" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha / Chave de API</FormLabel>
                                        <FormControl><Input type="password" placeholder="Sua senha ou chave" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                             <FormField control={form.control} name="EMAIL_FROM" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-mail Remetente</FormLabel>
                                    <FormControl><Input type="email" placeholder="noreply@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <Separator className="my-6" />
                             <div className="space-y-2">
                                <h3 className="text-sm font-medium">Testar Envio de E-mail</h3>
                                <div className="flex flex-col smm:flex-row gap-2">
                                    <Input
                                        type="email"
                                        placeholder="E-mail de destino"
                                        value={testEmailRecipient}
                                        onChange={(e) => setTestEmailRecipient(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="button" variant="secondary" onClick={handleSendTestEmail} disabled={isTestingEmail}>
                                        {isTestingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Enviar Teste
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <div className="flex justify-end">
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Todas as Chaves'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

    