import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import PersonalInfo from "./pages/PersonalInfo";
import Attendance from "./pages/Attendance";
import FeeDetails from "./pages/FeeDetails";
import GradeBook from "./pages/GradeBook";
import LabMark from "./pages/LabMark";
import CATMark from "./pages/CATMark";
import AssignmentMark from "./pages/AssignmentMark";
import TimeTable from "./pages/TimeTable";
import SubjectRegistration from "./pages/SubjectRegistration";
import LeaveOD from "./pages/LeaveOD";
import Certificates from "./pages/Certificates";
import Feedbacks from "./pages/Feedbacks";
import ClassCommittee from "./pages/ClassCommittee";
import Messages from "./pages/Messages";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";
import AdminStudentManagement from "./pages/AdminStudentManagement";
import PrintDashboard from "./pages/PrintDashboard";
import PrintKeeperPortal from "./pages/PrintKeeperPortal";
import SmartClassroom from "./pages/SmartClassroom";
import Moodle from "./pages/Moodle";

// Layout
import DashboardLayout from "./components/layout/DashboardLayout";
import PrintKeeperLayout from "./components/layout/PrintKeeperLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<Login />} />
            <Route path="/print-keeper-login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Protected Routes with Dashboard Layout */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/personal-info" element={<PersonalInfo />} />
              <Route path="/timetable" element={<TimeTable />} />
              <Route path="/subject-registration" element={<SubjectRegistration />} />
              <Route path="/leave-od" element={<LeaveOD />} />
              <Route path="/attendance" element={<Attendance />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/cat-mark" element={<CATMark />} />
            <Route path="/lab-mark" element={<LabMark />} />
            <Route path="/assignment-mark" element={<AssignmentMark />} />
            <Route path="/gradebook" element={<GradeBook />} />
            <Route path="/feedbacks" element={<Feedbacks />} />
            <Route path="/fee-details" element={<FeeDetails />} />
            <Route path="/class-committee" element={<ClassCommittee />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/admin/students" element={<AdminStudentManagement />} />
            <Route path="/print" element={<PrintDashboard />} />
            <Route path="/smart-classroom" element={<SmartClassroom />} />
            <Route path="/moodle" element={<Moodle />} />
          </Route>

          {/* Print Keeper Portal */}
          <Route element={<PrintKeeperLayout />}>
            <Route path="/print-keeper" element={<PrintKeeperPortal />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
