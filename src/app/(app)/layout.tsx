"use client"

import * as React from "react"
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Blocks, Calendar, LayoutDashboard, Users, Construction, Shield, LogOut, Cog, Bot } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, permissions, loading, signOut } = useAuth();
  const [isSchedulesOpen, setIsSchedulesOpen] = React.useState(pathname.startsWith('/schedules'));

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: true },
    { href: '/volunteers', label: 'Voluntários', icon: Users, permission: permissions?.canManageVolunteers },
    { href: '/events', label: 'Eventos', icon: Calendar, permission: permissions?.canManageEvents },
    { href: '/areas', label: 'Áreas de Serviço', icon: Construction, permission: permissions?.canManageAreas },
    { href: '/teams', label: 'Equipes', icon: Shield, permission: permissions?.canManageTeams },
  ];

  const bottomMenuItems = [
      // Settings is always visible now
      { href: '/settings', label: 'Configurações', icon: Cog, permission: true },
  ];

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Forcing a component refresh by adding an effect.
  React.useEffect(() => {
    console.log("Layout component mounted/updated.");
  }, []);
  
  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  }

  if (loading || !user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex items-center space-x-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="text-muted-foreground">Carregando...</span>
            </div>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 text-primary">
                    <Blocks className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-semibold text-sidebar-foreground/90">ScaleMaster</h1>
            </div>
        </SidebarHeader>
        <SidebarContent className="flex flex-col justify-between">
          <SidebarMenu>
            {menuItems.map((item) => (
              item.permission && (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={{
                      children: item.label,
                      className: "bg-primary text-primary-foreground",
                    }}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            ))}
             {permissions?.canViewSchedules && (
                <Collapsible open={isSchedulesOpen} onOpenChange={setIsSchedulesOpen} className="w-full">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={pathname.startsWith('/schedules')}
                        tooltip={{
                          children: "Escalas",
                          className: "bg-primary text-primary-foreground",
                        }}
                      >
                        <Bot />
                        <span>Escalas</span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent>
                      <SidebarMenuSub>
                          {permissions?.canGenerateSchedules && (
                            <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={pathname === '/schedules/generate'}>
                                    <Link href="/schedules/generate">Gerar Escala</Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                          <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={pathname === '/schedules'}>
                                  <Link href="/schedules">Escalas Salvas</Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={pathname === '/schedules/calendar'}>
                                  <Link href="/schedules/calendar">Calendário de Equipes</Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                      </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
             )}
          </SidebarMenu>
          <SidebarMenu>
            {bottomMenuItems.map((item) => (
                item.permission && (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={{
                            children: item.label,
                            className: "bg-primary text-primary-foreground",
                        }}
                        >
                        <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger className="md:hidden" />
            <div className="flex items-center gap-4 ml-auto">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'Usuário'} />
                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
