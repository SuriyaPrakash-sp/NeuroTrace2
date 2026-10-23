import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ToastProvider } from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import Assessment from "./pages/Assessment";
import TherapyPlan from "./pages/TherapyPlan";
import Exercise from "./pages/Exercise";
import Progress from "./pages/Progress";
import { EmptyState } from "./components/EmptyState";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentProfile />} />
            <Route path="/students/:id/assessment" element={<Assessment />} />
            <Route path="/students/:id/therapy-plan" element={<TherapyPlan />} />
            <Route path="/students/:id/exercise" element={<Exercise />} />
            <Route path="/students/:id/progress" element={<Progress />} />
            <Route path="*" element={<EmptyState title="Page not found" description="That page doesn't exist." />} />
          </Routes>
        </AppShell>
      </ToastProvider>
    </BrowserRouter>
  );
}
