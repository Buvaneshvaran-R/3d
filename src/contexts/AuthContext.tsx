import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = "student" | "admin" | "print_keeper";

interface SelectedStudent {
  id: string;
  name: string;
  registerNo: string;
  department: string;
  year: string;
  semester: string;
}

interface AuthContextType {
  user: (SupabaseUser & { name?: string }) | null;
  session: Session | null;
  role: UserRole | null;
  selectedStudent: SelectedStudent | null;
  login: (email: string, password: string, roleType?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  selectStudent: (student: SelectedStudent | null) => void;
  isAdmin: () => boolean;
  isStudent: () => boolean;
  isPrintKeeper: () => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Get user role from metadata or database
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // 1. Check admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('id, name')
        .eq('user_id', userId)
        .single();

      if (adminData) {
        setRole('admin');
        setUser((u) => u ? { ...u, name: adminData.name } : u);
        return;
      }

      // 2. Check print keeper
      const { data: keeperData } = await supabase
        .from('print_keepers')
        .select('id, name')
        .eq('user_id', userId)
        .single();

      if (keeperData) {
        setRole('print_keeper');
        setUser((u) => u ? { ...u, name: keeperData.name } : u);
        return;
      }

      // 3. Default to student
      const { data: studentData } = await supabase
        .from('students')
        .select('name')
        .eq('user_id', userId)
        .single();

      setRole('student');
      setUser((u) => (u && studentData) ? { ...u, name: studentData.name } : u);
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole('student');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, roleType?: UserRole) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (roleType && data.user) {
      if (roleType === 'print_keeper') {
        const { data: keeperData } = await supabase
          .from('print_keepers')
          .select('id')
          .eq('user_id', data.user.id)
          .single();
        if (!keeperData) {
          await supabase.auth.signOut();
          throw new Error('Invalid credentials. Please use print keeper credentials.');
        }
        return;
      }

      const { data: adminData } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      const userIsAdmin = !!adminData;
      const expectedAdmin = roleType === 'admin';

      if (userIsAdmin !== expectedAdmin) {
        await supabase.auth.signOut();
        throw new Error(
          expectedAdmin
            ? 'Invalid credentials. Please use admin credentials to login as admin.'
            : 'Invalid credentials. Please use student credentials to login as student.'
        );
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSelectedStudent(null);
  };

  const selectStudent = (student: SelectedStudent | null) => {
    setSelectedStudent(student);
  };

  const isAdmin = () => role === 'admin';
  const isStudent = () => role === 'student';
  const isPrintKeeper = () => role === 'print_keeper';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        selectedStudent,
        login,
        logout,
        selectStudent,
        isAdmin,
        isStudent,
        isPrintKeeper,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
