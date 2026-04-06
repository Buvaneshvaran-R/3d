import { StudentSelector } from "@/components/admin/StudentSelector";
import { AdminStudentEditor } from "@/components/admin/AdminStudentEditor";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

const AdminStudentManagement = () => {
  const { isAdmin, selectedStudent } = useAuth();

  // Redirect if not admin (optional, you can handle this in routing)
  if (!isAdmin()) {
    return (
      <Card className="border-none shadow-card">
        <CardContent className="p-12 text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">This page is only accessible to administrators.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Student Management</h1>
        <p className="text-muted-foreground mt-2">
          Search and edit student information, academic records, and personal details
        </p>
      </div>

      {/* Student Selector */}
      <StudentSelector />

      {/* Student Editor - only show when a student is selected */}
      {selectedStudent ? (
        <AdminStudentEditor />
      ) : (
        <Card className="border-none shadow-card">
          <CardContent className="p-12 text-center">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Student Selected</h3>
            <p className="text-muted-foreground">
              Please search and select a student above to view and edit their information
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminStudentManagement;
