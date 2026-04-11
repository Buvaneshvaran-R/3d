import { useAuth } from "@/contexts/AuthContext";
import { StudentFinder } from "./StudentFinder";

export function StudentFinderWrapper() {
  const { isAdmin, selectStudent } = useAuth();
  
  if (!isAdmin || !isAdmin()) return null;
  
  return (
    <div className="mb-6">
      <StudentFinder onStudentSelect={selectStudent || (() => {})} />
    </div>
  );
}
