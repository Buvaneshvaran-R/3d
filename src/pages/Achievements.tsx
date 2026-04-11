import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AdminAchievements from "@/components/achievements/AdminAchievements";
import StudentAchievements from "@/components/achievements/StudentAchievements";
import { supabase } from "@/lib/supabase";

export default function Achievements() {
  const { role, user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'student' && user) {
      const fetchStudentId = async () => {
        const { data } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setStudentId(data.id);
        }
      };
      fetchStudentId();
    }
  }, [role, user]);

  return (
    <div className="container mx-auto p-4 max-w-7xl animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
          <p className="text-muted-foreground mt-1">
            {role === 'admin' 
              ? "Manage student achievements and certificates" 
              : "View your earned achievements and certificates"}
          </p>
        </div>
      </div>

      {role === 'admin' && <AdminAchievements />}
      {role === 'student' && studentId && <StudentAchievements studentId={studentId} />}
    </div>
  );
}
