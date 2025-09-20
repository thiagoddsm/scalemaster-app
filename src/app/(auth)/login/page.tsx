"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Blocks, Cog, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { signInWithGoogle, user, loading, bypassAuthForAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');


  useEffect(() => {
    // This effect now also handles the admin bypass state
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  
  const handleAdminLogin = () => {
    if (password === 'admin123') {
      bypassAuthForAdmin();
      toast({
        title: 'Acesso de Administrador',
        description: 'Login de emergência bem-sucedido.',
      });
      setIsPasswordDialogOpen(false);
      // The useEffect will handle the redirect
    } else {
      toast({
        variant: 'destructive',
        title: 'Senha Incorreta',
        description: 'A senha de administrador está incorreta.',
      });
    }
    setPassword('');
  };


  const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 9.998C34.793 6.368 29.824 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691c2.126-3.488 5.799-5.945 10.111-6.536L9.998 38.802C6.368 34.793 4 29.824 4 24c0-3.14.78-6.066 2.16-8.68z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192L30.537 31.09C28.297 32.793 25.753 34 24 34c-4.418 0-8.28-2.05-10.74-5.226L6.299 35.436C9.99 40.846 16.639 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.16-4.087 5.571l7.537 7.537C41.258 36.372 44 30.636 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );

  return (
    <>
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={() => setIsPasswordDialogOpen(true)}>
          <Cog className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
             <div className="flex justify-center items-center mb-4">
              <Blocks className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao ScaleMaster</CardTitle>
            <CardDescription>Crie sua conta ou faça login com o Google para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={signInWithGoogle}
              disabled={loading}
            >
              {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                  <>
                      <GoogleIcon />
                      Continuar com Google
                  </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Acesso de Administrador</DialogTitle>
                <DialogDescription>
                    Digite a senha de administrador para login de emergência no ambiente de desenvolvimento.
                </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 py-4">
                <div className="relative flex-grow">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="master-password"
                        type="password"
                        placeholder="Senha"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="button" onClick={handleAdminLogin}>Entrar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
