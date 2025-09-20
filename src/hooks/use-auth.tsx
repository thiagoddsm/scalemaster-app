"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User, signOut as firebaseSignOut, AuthError } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { UserPermission } from '@/lib/types';
import { toast } from './use-toast';

interface AuthContextType {
  user: User | null;
  permissions: UserPermission | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultPermissions: Omit<UserPermission, 'id' | 'userId' | 'userDisplayName' | 'userEmail' | 'userPhotoURL'> = {
  canManageVolunteers: true,
  canManageEvents: true,
  canManageAreas: true,
  canManageTeams: true,
  canViewSchedules: true,
  canGenerateSchedules: true,
  canManageSettings: true,
};

const checkAndCreateUserPermissions = async (user: User): Promise<void> => {
  const userPermRef = doc(db, 'userPermissions', user.uid);
  const userPermSnap = await getDoc(userPermRef);

  if (!userPermSnap.exists()) {
    // Check if it's the very first user to grant admin rights
    const firstUserPerms = { ...defaultPermissions };
    
    await setDoc(userPermRef, {
      id: user.uid,
      userId: user.uid,
      userDisplayName: user.displayName || 'Novo Usuário',
      userEmail: user.email,
      userPhotoURL: user.photoURL || '',
      ...firstUserPerms,
    });
  }
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userPermRef = doc(db, 'userPermissions', user.uid);
        
        const permsUnsubscribe = onSnapshot(userPermRef, async (snap) => {
            if (!snap.exists()) {
                await checkAndCreateUserPermissions(user);
            } else {
                 setPermissions(snap.data() as UserPermission);
            }
            setLoading(false);
        });

        return () => permsUnsubscribe();

      } else {
        setUser(null);
        setPermissions(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    auth.languageCode = 'pt'; // Set language for the popup
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await checkAndCreateUserPermissions(result.user);
    } catch (error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/popup-blocked') {
            toast({
                variant: 'destructive',
                title: 'Pop-up Bloqueado',
                description: 'O seu navegador bloqueou a janela de login. Por favor, desative o bloqueador de pop-ups e tente novamente.',
            });
        } else if (authError.code !== 'auth/cancelled-popup-request' && authError.code !== 'auth/popup-closed-by-user') {
             console.error("Error signing in with Google: ", error);
             // We show a more generic error for other issues, including the referer blocked one
             toast({
                variant: 'destructive',
                title: 'Erro de Login',
                description: `Não foi possível fazer login. Verifique sua conexão ou as configurações do projeto Firebase. (Código: ${authError.code})`,
             });
        }
    } finally {
      // Don't set loading to false here, the onAuthStateChanged listener will handle it
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const value = { user, permissions, loading, signInWithGoogle, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
