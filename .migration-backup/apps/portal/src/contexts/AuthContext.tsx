import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole =
  | 'borrower'
  | 'consultant'
  | 'branch_manager'
  | 'admin'
  | 'super_admin';

export type AuthProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  contact_number: string | null;
  avatar_url: string | null;
};

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  mobile?: string;
  idNumber?: string;
};

export type SignUpResult = {
  /** True when the new user already has a session (no email confirmation required). */
  hasSession: boolean;
  /** True when Supabase sent a confirmation email and the user must confirm before signing in. */
  needsConfirmation: boolean;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(input: SignUpInput): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
      email:    input.email,
      password: input.password,
      options: {
        data: {
          full_name:      input.fullName,
          mobile:         input.mobile ?? null,
          id_number:      input.idNumber ?? null,
          // Default role for self-service signups is borrower; staff are
          // provisioned manually by an admin.
          role:           'borrower',
        },
      },
    });
    if (error) throw error;

    // Best-effort: create a corresponding profiles row if signup completes
    // immediately (no email confirmation required). Most Supabase projects use
    // a DB trigger for this — but if not, this guarantees the borrower has a
    // profile they can edit on first login.
    if (data.user && data.session) {
      await supabase
        .from('profiles')
        .upsert(
          {
            id:             data.user.id,
            email:          input.email,
            full_name:      input.fullName,
            role:           'borrower',
            contact_number: input.mobile ?? null,
          },
          { onConflict: 'id' },
        );
    }

    return {
      hasSession:         Boolean(data.session),
      needsConfirmation:  Boolean(data.user && !data.session),
    };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const STAFF_ROLES: UserRole[] = ['consultant', 'branch_manager', 'admin', 'super_admin'];
export const isStaff = (role: UserRole) => STAFF_ROLES.includes(role);
