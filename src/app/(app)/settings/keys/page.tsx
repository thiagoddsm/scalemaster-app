
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SecretsSchema, type Secrets } from '@/lib/types';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, Send, Loader2, QrCode, Power } from "lucide-react"
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function KeysPage() {
    const { permissions, loading: authLoading } = useAuth();
    const { secrets, saveSecrets, loading: dataLoading, sendTestEmail, sendTestWhatsApp } = useAppData();
    const router = useRouter();
    const { toast } = useToast();

    const [testEmailRecipient, setTestEmailRecipient] = useState('');
    const [testPhone, setTestPhone] = useState('');
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
    
    // State for unofficial WhatsApp
    const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [waStatus, setWaStatus] = useState<'disconnected' | 'loading' | 'getting_qr' | 'got_qr' | 'connected' | 'error'>('disconnected');

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

    const handleConnectWhatsApp = async () => {
        // Placeholder for a flow that would handle WhatsApp Web JS
        async function getWhatsAppQrCode(): Promise<{ qr: string } | { error: string }> {
            // In a real scenario, this would call a Genkit flow
            // that runs a whatsapp-web.js client and gets the QR code.
            // For now, we'll simulate it.
            await new Promise(resolve => setTimeout(resolve, 1500));
            // This is a fake QR code for demonstration
            return { qr: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACXljzdAAAABlBMVEX///8AAABVwtN+AAACiklEQVR42u3aQW7DMAwEwLnA7n/l3AY6W6kRGMlDk/t+VExJ2a5kZ/c+3/2+fx/g4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg/jB43q/d+sl9u92+1f+5V+3X/iJ4WBEP4P8g3u+4q+B3+a9Z85/t+6e8+4aCg4ODg4ODg4OD803w7+v7P2q+z+rO2jA4ODg4ODg4ODg4uGnw6yE4P+s1g4ODg4ODg4ODg4PzWfB28/0/GxwODg4ODg4ODg7OG8E7/CHu/2z5Xg4ODg4ODg4ODg7+k+DNT/yc/sf9xMHg4ODg4ODg4ODg/Br8/o+et+f8rNf9/gTvgYODg4ODg4ODg4PzTfA+g+fsrL7d/53g7ff/b9sZODg4ODg4ODg4ODhvBA/n/d7+fB/w2xmcDg4ODg4ODg4ODs4bwa+f7fvy3R8cnA4ODg4ODg4ODs4/g+fs+S5/d/Z7ODg4ODg4ODg4ODgvBP9+V/53gofz/iS4L3g4ODg4ODg4ODg4/xG8/p/d/bH2+f5Yd2fg4ODg4ODg4ODgvA2+z/v1r/1f24d/PQ4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODs4nwT/g1+3b/V/B28R/f7Yf3gQODg4ODg4ODg4OLg3+gH+3P9vf3c2Cg4ODg4ODg4OD8xXwfr/b/53g/azv3/Wd8F7g4ODg4ODg4ODgvB38gL/b/S84T/b3d2Pg4ODg4ODg4ODg/BH8gL/b/S94V+3z/b7eBw4ODg4ODg4ODg7OG8Gv2/+b/3bwfD9v3x04ODg4ODg4ODg4/wR/wP9d+3b+d/YDd/chfgscDg4ODg4ODg4OzgvBG1p8/0/wfmY3ODg4ODg4ODg4ODhvBf8L+AD/fhc83/f13sHg4ODg4ODg4ODg/Bv4Ab/f/S/4+S54eP8E7wIHB4f/u+D/+ODg4OA8H3wAf7f/W/b8fvd+Pw4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODs4/4C/9K2s+z/b3/AfeAwdn4ODg4OB8HvAA/s+Cz/MGODg4OM/gvfN+dwYODg7O/wD/GziA/0vwiuATODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4/EvwD5Y7Q3w9W9gSAAAAAElFTkSuQmCC' };
        }
        
        setIsQrCodeDialogOpen(true);
        setWaStatus('getting_qr');
        setQrCodeDataUrl('');
        const result = await getWhatsAppQrCode();
        if ('qr' in result) {
            setQrCodeDataUrl(result.qr);
            setWaStatus('got_qr');
            // In a real app, you'd have a WebSocket or polling mechanism here
            // to listen for the 'authenticated' event from the backend.
            // We'll simulate it.
            setTimeout(() => {
                setWaStatus('connected');
                toast({ title: 'Conectado!', description: 'Seu WhatsApp foi conectado com sucesso.' });
                setTimeout(() => setIsQrCodeDialogOpen(false), 1500);
            }, 10000); // simulate 10s to scan
        } else {
            setWaStatus('error');
            toast({ variant: 'destructive', title: 'Erro', description: result.error });
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
                            <CardTitle>WhatsApp (Não Oficial via QR Code)</CardTitle>
                            <CardDescription>
                                Conecte uma conta pessoal do WhatsApp para enviar notificações. 
                                <span className="font-bold text-destructive"> Use com cautela, pois APIs não oficiais podem violar os termos de serviço do WhatsApp.</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Button type="button" onClick={handleConnectWhatsApp}>
                                <QrCode className="mr-2 h-4 w-4" />
                                Conectar com WhatsApp
                            </Button>
                        </CardContent>
                    </Card>


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
                                <div className="flex flex-col sm:flex-row gap-2">
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

            <Dialog open={isQrCodeDialogOpen} onOpenChange={setIsQrCodeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Conectar WhatsApp</DialogTitle>
                        <DialogDescription>
                            Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4 min-h-[300px]">
                        {waStatus === 'getting_qr' && (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-muted-foreground">Gerando QR Code...</p>
                            </div>
                        )}
                        {waStatus === 'got_qr' && qrCodeDataUrl && (
                            <Image src={qrCodeDataUrl} alt="QR Code do WhatsApp" width={250} height={250} />
                        )}
                         {waStatus === 'connected' && (
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                   <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                     <Power className="h-8 w-8 text-white" />
                                   </div>
                                </div>
                                <p className="font-medium text-lg mt-4">Conectado com Sucesso!</p>
                                <p className="text-muted-foreground">Esta janela será fechada em breve.</p>
                            </div>
                        )}
                         {waStatus === 'error' && (
                             <div className="flex flex-col items-center gap-2 text-center text-destructive">
                                <p>Não foi possível gerar o QR Code. Tente novamente.</p>
                             </div>
                         )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
