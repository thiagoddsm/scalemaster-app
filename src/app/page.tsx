"use client";

import Link from 'next/link';
import { Blocks, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WelcomePage() {

  // This page replaces the redirect logic to be compatible with static hosting like GitHub Pages.
  // It provides a clear entry point for the user.

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
       <Card className="w-full max-w-md">
        <CardHeader className="text-center">
           <div className="flex justify-center items-center mb-4">
            <Blocks className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Bem-vindo ao ScaleMaster</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Sua solução completa para gerenciar escalas de voluntários com eficiência.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="mb-6">
                Organize eventos, gerencie equipes e comunique-se com seus voluntários de forma simples e inteligente.
            </p>
          <Button asChild size="lg">
            <Link href="/login">
                <LogIn className="mr-2 h-5 w-5" />
                Acessar o Painel
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
