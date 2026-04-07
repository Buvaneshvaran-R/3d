import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  MessageSquare,
  Trash2,
  Upload,
} from "lucide-react";

const SUBJECT_OPTIONS = ["Python", "Data Structure", "C Program"] as const;
const DEPARTMENT_OPTIONS = ["AIDS", "CSE", "CSBS", "ECE", "BIO TECH","CCE","AIML"] as const;

type MoodleNote = {
  id: string;
  subject: string;
  year: string;
  title: string;
  content: string;
  pdfName: string;
  pdfPath: string;
  pdfUrl: string;
  createdAt: string;
  createdBy: string;
};

type SubjectOption = {
  id: string;
  code: string;
  name: string;
  semester: number | null;
};

type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  registerNo: string;
  marksObtained: number | null;
  feedback: string;
  submissionText: string;
  fileName: string;
  filePath: string;
  submittedAt: string;
  gradedAt: string;
};

type AssignmentItem = {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  targetYear: number | null;
  targetSection: string;
  targetDepartment: string;
  createdAt: string;
  createdBy: string;
  attachmentName: string;
  attachmentPath: string;
  submissions: AssignmentSubmission[];
};

const emptyNoteForm = {
  subject: "",
  year: "",
  title: "",
  content: "",
};

const emptyAssignmentForm = {
  subjectId: "",
  title: "",
  description: "",
  dueDate: "",
  maxMarks: "10",
  targetYear: "",
  targetSection: "",
  targetDepartment: "",
};

const normalizeDepartment = (value: string | null | undefined) =>
  (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const normalizeSection = (value: string | null | undefined) =>
  (value || "").toUpperCase().trim();

const isOpenTarget = (value: string | null | undefined) => {
  const normalized = normalizeDepartment(value);
  return normalized === "" || normalized === "ALL";
};

const deriveAcademicYear = (currentYear: number | null | undefined, semester: number | null | undefined) => {
  if (typeof semester === "number" && semester >= 1 && semester <= 8) {
    return Math.ceil(semester / 2);
  }

  if (typeof currentYear === "number" && currentYear >= 1 && currentYear <= 4) {
    return currentYear;
  }

  return null;
};

const createPdfPreviewUrl = (url: string): { src: string; revoke: boolean } => {
  if (!url) {
    return { src: "", revoke: false };
  }

  if (!url.startsWith("data:")) {
    return { src: url, revoke: false };
  }

  const [meta, base64Content] = url.split(",", 2);
  if (!meta || !base64Content) {
    return { src: url, revoke: false };
  }

  const mimeMatch = meta.match(/^data:([^;]+);base64$/i);
  if (!mimeMatch) {
    return { src: url, revoke: false };
  }

  try {
    const binary = atob(base64Content);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeMatch[1] });
    return { src: URL.createObjectURL(blob), revoke: true };
  } catch {
    return { src: url, revoke: false };
  }
};

const Moodle = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const adminView = isAdmin();

  const [notes, setNotes] = useState<MoodleNote[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);

  const [studentYear, setStudentYear] = useState<number | null>(null);
  const [studentSection, setStudentSection] = useState<string>("");
  const [studentDepartment, setStudentDepartment] = useState<string>("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [studentYearFilter, setStudentYearFilter] = useState<string>("");

  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);

  const [notePdfFile, setNotePdfFile] = useState<File | null>(null);
  const [assignmentQuestionFile, setAssignmentQuestionFile] = useState<File | null>(null);

  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, { text: string; file: File | null }>>({});
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { marks: string; feedback: string }>>({});

  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<"notes" | "assignments">("assignments");

  const [previewPdf, setPreviewPdf] = useState<{
    open: boolean;
    title: string;
    url: string;
  }>({
    open: false,
    title: "",
    url: "",
  });
  const [previewSrc, setPreviewSrc] = useState("");

  const ensureAdminId = async () => {
    if (adminId) {
      return adminId;
    }

    if (!user?.id || !adminView) {
      throw new Error("Admin session not found.");
    }

    const { data, error } = await supabase
      .from("admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (error || !data?.id) {
      throw error || new Error("Admin profile not found.");
    }

    setAdminId(data.id);
    return data.id;
  };

  const fetchSubjects = async (currentStudentId: string | null) => {
    try {
      if (adminView) {
        const { data, error } = await supabase
          .from("subjects")
          .select("id, code, name, semester")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) {
          throw error;
        }

        setSubjects(
          (data || []).map((row: any) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            semester: row.semester ?? null,
          })),
        );
        return;
      }

      if (!currentStudentId) {
        setSubjects([]);
        return;
      }

      const { data, error } = await supabase
        .from("student_subjects")
        .select("subject_id, subjects(id, code, name, semester)")
        .eq("student_id", currentStudentId);

      if (error) {
        throw error;
      }

      const mapped = (data || [])
        .map((row: any) => row.subjects)
        .filter(Boolean)
        .map((subject: any) => ({
          id: subject.id,
          code: subject.code,
          name: subject.name,
          semester: subject.semester ?? null,
        }));

      const uniqueById = new Map<string, SubjectOption>();
      mapped.forEach((subject: SubjectOption) => {
        uniqueById.set(subject.id, subject);
      });

      setSubjects(Array.from(uniqueById.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error loading subjects:", error);
      setSubjects([]);
    }
  };

  const fetchNotes = async () => {
    if (!user?.id) {
      setNotes([]);
      setLoadingNotes(false);
      return;
    }

    setLoadingNotes(true);
    try {
      let notesQuery = supabase
        .from("moodle_notes")
        .select("id, subject, year, title, content, pdf_name, pdf_path, created_at, admins(name)");

      if (!adminView) {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("current_year, semester")
          .eq("user_id", user.id)
          .single();

        const derivedYear = deriveAcademicYear(studentData?.current_year, studentData?.semester);

        if (studentError || !derivedYear) {
          throw studentError || new Error("Student year not found.");
        }

        setStudentYear(derivedYear);

        const selectedYear = studentYearFilter
          ? Number(studentYearFilter)
          : derivedYear;

        if (!studentYearFilter) {
          setStudentYearFilter(String(derivedYear));
        }

        notesQuery = notesQuery.eq("year", selectedYear);
      } else {
        setStudentYear(null);
        if (studentYearFilter) {
          setStudentYearFilter("");
        }
      }

      const { data, error } = await notesQuery.order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const mapped: MoodleNote[] = (data || []).map((row: any) => {
        const { data: urlData } = supabase.storage.from("moodle-notes").getPublicUrl(row.pdf_path);
        return {
          id: row.id,
          subject: row.subject,
          year: String(row.year),
          title: row.title,
          content: row.content,
          pdfName: row.pdf_name,
          pdfPath: row.pdf_path,
          pdfUrl: urlData.publicUrl,
          createdAt: row.created_at,
          createdBy: row.admins?.name || "Admin",
        };
      });

      setNotes(mapped);
    } catch (error) {
      console.error("Error loading Moodle notes:", error);
      setNotes([]);
      setStudentYear(null);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchAssignments = async () => {
    if (!user?.id) {
      setAssignments([]);
      setLoadingAssignments(false);
      return;
    }

    setLoadingAssignments(true);
    try {
      let currentStudentId: string | null = null;
      let allowedSubjectIds: string[] = [];
      let effectiveStudentYear: number | null = null;
      let effectiveStudentSection = "";
      let effectiveStudentDepartment = "";

      if (!adminView) {
        const [studentIdRpc, studentYearRpc, studentSectionRpc, studentDepartmentRpc] = await Promise.all([
          supabase.rpc("get_student_id"),
          supabase.rpc("get_student_current_year"),
          supabase.rpc("get_student_section"),
          supabase.rpc("get_student_department"),
        ]);

        currentStudentId = (studentIdRpc.data as string) || null;
        effectiveStudentYear = typeof studentYearRpc.data === "number" ? studentYearRpc.data : null;
        effectiveStudentSection = String(studentSectionRpc.data || "").toUpperCase();
        effectiveStudentDepartment = String(studentDepartmentRpc.data || "").toUpperCase();

        // Fallback when RPC helpers are not available.
        if (!currentStudentId) {
          const { data: studentRow, error: studentError } = await supabase
            .from("students")
            .select("id, current_year, semester, section, department")
            .eq("user_id", user.id)
            .single();

          if (studentError || !studentRow?.id) {
            throw studentError || new Error("Student profile not found.");
          }

          currentStudentId = studentRow.id;
          effectiveStudentYear = deriveAcademicYear(studentRow.current_year, studentRow.semester);
          effectiveStudentSection = (studentRow.section || "").toUpperCase();
          effectiveStudentDepartment = (studentRow.department || "").toUpperCase();
        }

        if (!currentStudentId) {
          throw new Error("Student profile not found.");
        }

        setStudentId(currentStudentId);
        setStudentYear(effectiveStudentYear);
        setStudentSection(effectiveStudentSection);
        setStudentDepartment(effectiveStudentDepartment);

        const { data: links, error: linksError } = await supabase
          .from("student_subjects")
          .select("subject_id")
          .eq("student_id", currentStudentId);

        if (linksError) {
          throw linksError;
        }

        allowedSubjectIds = (links || []).map((row: any) => row.subject_id).filter(Boolean);
      } else {
        setStudentId(null);
        setStudentSection("");
        setStudentDepartment("");
      }

      await fetchSubjects(currentStudentId);

      let assignmentQuery = supabase
        .from("assignments")
        .select("id, subject_id, title, description, due_date, max_marks, target_year, target_section, target_department, created_at, attachment_name, attachment_path, subjects(name, code), admins(name)")
        .not("created_by", "is", null);

      if (!adminView) {
        if (allowedSubjectIds.length === 0) {
          setAssignments([]);
          setGradeDrafts({});
          setLoadingAssignments(false);
          return;
        }

        assignmentQuery = assignmentQuery.in("subject_id", allowedSubjectIds);
      }

      const { data: assignmentRows, error: assignmentError } = await assignmentQuery.order("created_at", { ascending: false });

      if (assignmentError) {
        throw assignmentError;
      }

      const assignmentsData = assignmentRows || [];
      const assignmentIds = assignmentsData.map((row: any) => row.id);

      let submissionRows: any[] = [];
      if (assignmentIds.length > 0) {
        let submissionQuery = supabase
          .from("assignment_submissions")
          .select("id, assignment_id, student_id, marks_obtained, feedback, submission_text, file_name, file_path, submitted_at, graded_at, students(name, register_no)");

        if (adminView) {
          submissionQuery = submissionQuery.in("assignment_id", assignmentIds);
        } else if (currentStudentId) {
          submissionQuery = submissionQuery
            .eq("student_id", currentStudentId)
            .in("assignment_id", assignmentIds);
        }

        const { data, error } = await submissionQuery;
        if (error) {
          throw error;
        }
        submissionRows = data || [];
      }

      const groupedSubmissions = submissionRows.reduce((acc: Record<string, AssignmentSubmission[]>, row: any) => {
        const list = acc[row.assignment_id] || [];
        list.push({
          id: row.id,
          assignmentId: row.assignment_id,
          studentId: row.student_id,
          studentName: row.students?.name || "Student",
          registerNo: row.students?.register_no || "-",
          marksObtained: typeof row.marks_obtained === "number" ? row.marks_obtained : null,
          feedback: row.feedback || "",
          submissionText: row.submission_text || "",
          fileName: row.file_name || "",
          filePath: row.file_path || "",
          submittedAt: row.submitted_at || "",
          gradedAt: row.graded_at || "",
        });
        acc[row.assignment_id] = list;
        return acc;
      }, {});

      const mappedAssignments: AssignmentItem[] = assignmentsData.map((row: any) => ({
        id: row.id,
        subjectId: row.subject_id,
        subjectCode: row.subjects?.code || "N/A",
        subjectName: row.subjects?.name || "Unknown Subject",
        title: row.title,
        description: row.description || "",
        dueDate: row.due_date || "",
        maxMarks: Number(row.max_marks || 10),
        targetYear: row.target_year ?? null,
        targetSection: row.target_section || "ALL",
        targetDepartment: row.target_department || "ALL",
        createdAt: row.created_at,
        createdBy: row.admins?.name || "Faculty",
        attachmentName: row.attachment_name || "",
        attachmentPath: row.attachment_path || "",
        submissions: groupedSubmissions[row.id] || [],
      }));

      const visibleAssignments = adminView
        ? mappedAssignments
        : mappedAssignments.filter((assignment) => {
            const yearMatch = assignment.targetYear == null || assignment.targetYear === effectiveStudentYear;

            const sectionTarget = normalizeSection(assignment.targetSection);
            const studentSectionValue = normalizeSection(effectiveStudentSection);
            const sectionMatch = sectionTarget === "" || sectionTarget === "ALL" || sectionTarget === studentSectionValue;

            const departmentTarget = normalizeDepartment(assignment.targetDepartment);
            const studentDepartmentValue = normalizeDepartment(effectiveStudentDepartment);
            const departmentMatch = isOpenTarget(assignment.targetDepartment)
              || departmentTarget === studentDepartmentValue;

            return yearMatch && sectionMatch && departmentMatch;
          });

      setAssignments(visibleAssignments);

      const nextGradeDrafts: Record<string, { marks: string; feedback: string }> = {};
      visibleAssignments.forEach((assignment) => {
        assignment.submissions.forEach((submission) => {
          nextGradeDrafts[submission.id] = {
            marks: submission.marksObtained == null ? "" : String(submission.marksObtained),
            feedback: submission.feedback || "",
          };
        });
      });
      setGradeDrafts(nextGradeDrafts);

      if (!adminView) {
        const nextSubmissionDrafts: Record<string, { text: string; file: File | null }> = {};
        visibleAssignments.forEach((assignment) => {
          const mine = assignment.submissions[0];
          nextSubmissionDrafts[assignment.id] = {
            text: mine?.submissionText || "",
            file: null,
          };
        });
        setSubmissionDrafts(nextSubmissionDrafts);
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
      setAssignments([]);
      setSubjects([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [user?.id, adminView, studentYearFilter]);

  useEffect(() => {
    if (!user?.id || !adminView) {
      setAdminId(null);
      return;
    }

    ensureAdminId().catch((error) => {
      console.error("Error loading admin profile:", error);
      setAdminId(null);
    });
  }, [user?.id, adminView]);

  useEffect(() => {
    fetchAssignments();
  }, [user?.id, adminView]);

  useEffect(() => {
    if (!previewPdf.url) {
      setPreviewSrc("");
      return;
    }

    const preview = createPdfPreviewUrl(previewPdf.url);
    setPreviewSrc(preview.src);

    return () => {
      if (preview.revoke) {
        URL.revokeObjectURL(preview.src);
      }
    };
  }, [previewPdf.url]);

  const currentUserName = user?.name || user?.email || "Student";

  const handleAddNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteForm.subject.trim() || !noteForm.year.trim() || !noteForm.title.trim() || !noteForm.content.trim() || !notePdfFile) {
      return;
    }

    if (!adminView || !user?.id) {
      return;
    }

    setSavingNote(true);

    try {
      const { data: adminRow, error: adminError } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (adminError || !adminRow?.id) {
        throw adminError || new Error("Admin profile not found.");
      }

      const safeFileName = notePdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${Date.now()}_${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("moodle-notes")
        .upload(storagePath, notePdfFile, { upsert: false, contentType: "application/pdf" });

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } = await supabase.from("moodle_notes").insert({
        subject: noteForm.subject.trim(),
        year: Number(noteForm.year),
        title: noteForm.title.trim(),
        content: noteForm.content.trim(),
        pdf_name: notePdfFile.name,
        pdf_path: storagePath,
        created_by: adminRow.id,
      });

      if (insertError) {
        await supabase.storage.from("moodle-notes").remove([storagePath]);
        throw insertError;
      }

      setNoteForm(emptyNoteForm);
      setNotePdfFile(null);
      await fetchNotes();
      toast({
        title: "Note published",
        description: "Students can now access this note from Moodle.",
      });
    } catch (error) {
      console.error("Error adding Moodle note:", error);
      toast({
        title: "Failed to publish note",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const noteToDelete = notes.find((note) => note.id === noteId);

    try {
      const { error: deleteError } = await supabase
        .from("moodle_notes")
        .delete()
        .eq("id", noteId);

      if (deleteError) {
        throw deleteError;
      }

      if (noteToDelete?.pdfPath) {
        await supabase.storage.from("moodle-notes").remove([noteToDelete.pdfPath]);
      }

      setNotes((current) => current.filter((note) => note.id !== noteId));
      toast({ title: "Note deleted" });
    } catch (error) {
      console.error("Error deleting Moodle note:", error);
      toast({
        title: "Unable to delete note",
        variant: "destructive",
      });
    }
  };

  const handleCreateAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!adminView || !user?.id) {
      return;
    }

    if (!assignmentForm.subjectId || !assignmentForm.title.trim() || !assignmentForm.dueDate.trim()) {
      toast({
        title: "Missing details",
        description: "Subject, title, and deadline are required.",
        variant: "destructive",
      });
      return;
    }

    setSavingAssignment(true);
    let uploadedPath = "";

    try {
      const createdBy = await ensureAdminId();
      if (!createdBy) {
        throw new Error("Admin profile unavailable.");
      }

      if (assignmentQuestionFile) {
        const safeName = assignmentQuestionFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        uploadedPath = `teacher/${user.id}/questions/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("moodle-assignments")
          .upload(uploadedPath, assignmentQuestionFile, { upsert: false });

        if (uploadError) {
          throw uploadError;
        }
      }

      const maxMarksValue = Number(assignmentForm.maxMarks || "10");
      const safeMaxMarks = Number.isFinite(maxMarksValue) && maxMarksValue > 0 ? maxMarksValue : 10;

      const { error: insertError } = await supabase.from("assignments").insert({
        subject_id: assignmentForm.subjectId,
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim() || null,
        due_date: assignmentForm.dueDate,
        max_marks: safeMaxMarks,
        target_year: assignmentForm.targetYear ? Number(assignmentForm.targetYear) : null,
        target_section: assignmentForm.targetSection ? assignmentForm.targetSection.toUpperCase() : null,
        target_department: assignmentForm.targetDepartment ? assignmentForm.targetDepartment.toUpperCase() : null,
        created_by: createdBy,
        attachment_name: assignmentQuestionFile?.name || null,
        attachment_path: uploadedPath || null,
      });

      if (insertError) {
        if (uploadedPath) {
          await supabase.storage.from("moodle-assignments").remove([uploadedPath]);
        }
        throw insertError;
      }

      setAssignmentForm(emptyAssignmentForm);
      setAssignmentQuestionFile(null);
      await fetchAssignments();
      toast({
        title: "Assignment posted",
        description: "Students can now submit responses.",
      });
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Failed to create assignment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAssignment(false);
    }
  };

  const openAssignmentFile = async (filePath: string) => {
    if (!filePath) {
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("moodle-assignments")
        .createSignedUrl(filePath, 60);

      if (error || !data?.signedUrl) {
        throw error || new Error("Unable to generate file link.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error opening assignment file:", error);
      toast({
        title: "Unable to open file",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAssignment = async (assignment: AssignmentItem) => {
    if (adminView || !user?.id || !studentId) {
      return;
    }

    const draft = submissionDrafts[assignment.id] || { text: "", file: null };
    const existing = assignment.submissions[0] || null;

    if (existing?.gradedAt) {
      toast({
        title: "Submission locked",
        description: "This assignment is already graded and moved to Completed Assignments.",
        variant: "destructive",
      });
      return;
    }

    if (!draft.text.trim() && !draft.file && !existing?.filePath) {
      toast({
        title: "Nothing to submit",
        description: "Add text and/or upload a file before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingAssignmentId(assignment.id);

    let uploadedPath = existing?.filePath || "";
    let uploadedName = existing?.fileName || "";
    const oldPath = existing?.filePath || "";

    try {
      if (draft.file) {
        const safeName = draft.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        uploadedPath = `${user.id}/${assignment.id}/${Date.now()}_${safeName}`;
        uploadedName = draft.file.name;

        const { error: uploadError } = await supabase.storage
          .from("moodle-assignments")
          .upload(uploadedPath, draft.file, { upsert: false });

        if (uploadError) {
          throw uploadError;
        }
      }

      const { error: upsertError } = await supabase
        .from("assignment_submissions")
        .upsert(
          {
            assignment_id: assignment.id,
            student_id: studentId,
            submission_text: draft.text.trim() || null,
            file_name: uploadedName || null,
            file_path: uploadedPath || null,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "assignment_id,student_id" },
        );

      if (upsertError) {
        if (draft.file && uploadedPath && uploadedPath !== oldPath) {
          await supabase.storage.from("moodle-assignments").remove([uploadedPath]);
        }
        throw upsertError;
      }

      if (draft.file && oldPath && oldPath !== uploadedPath) {
        await supabase.storage.from("moodle-assignments").remove([oldPath]);
      }

      setSubmissionDrafts((current) => ({
        ...current,
        [assignment.id]: {
          text: draft.text,
          file: null,
        },
      }));

      await fetchAssignments();
      toast({
        title: existing ? "Submission updated" : "Assignment submitted",
      });
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast({
        title: "Submission failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingAssignmentId(null);
    }
  };

  const handleGradeSubmission = async (assignment: AssignmentItem, submission: AssignmentSubmission) => {
    if (!adminView) {
      return;
    }

    const draft = gradeDrafts[submission.id] || { marks: "", feedback: "" };
    const marks = draft.marks.trim() === "" ? null : Number(draft.marks);

    if (marks != null && (!Number.isFinite(marks) || marks < 0 || marks > assignment.maxMarks)) {
      toast({
        title: "Invalid marks",
        description: `Enter a value between 0 and ${assignment.maxMarks}.`,
        variant: "destructive",
      });
      return;
    }

    setGradingSubmissionId(submission.id);
    try {
      const graderId = await ensureAdminId();

      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          marks_obtained: marks,
          feedback: draft.feedback.trim() || null,
          graded_by: graderId,
          graded_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      if (error) {
        throw error;
      }

      await fetchAssignments();
      toast({
        title: "Grade saved",
      });
    } catch (error) {
      console.error("Error grading submission:", error);
      toast({
        title: "Unable to save grade",
        variant: "destructive",
      });
    } finally {
      setGradingSubmissionId(null);
    }
  };

  const openPdfPreview = (title: string, url: string) => {
    setPreviewPdf({ open: true, title, url });
  };

  const getDeadlineMeta = (dueDate: string) => {
    if (!dueDate) {
      return { label: "No deadline", variant: "outline" as const, overdue: false };
    }

    const endOfDay = new Date(`${dueDate}T23:59:59`);
    const now = new Date();
    if (now > endOfDay) {
      return { label: "Deadline passed", variant: "destructive" as const, overdue: true };
    }

    return {
      label: `Due ${new Date(dueDate).toLocaleDateString()}`,
      variant: "secondary" as const,
      overdue: false,
    };
  };

  const studentPendingAssignments = adminView
    ? []
    : assignments.filter((assignment) => !assignment.submissions[0]?.gradedAt);

  const studentCompletedAssignments = adminView
    ? []
    : assignments.filter((assignment) => Boolean(assignment.submissions[0]?.gradedAt));

  const visibleAssignments = adminView ? assignments : studentPendingAssignments;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="page-header">Moodle</h1>
            <p className="text-muted-foreground">
              Faculty can post notes and assignments with deadlines. Students can submit work and view grades here.
            </p>
            {!adminView && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">Filter year:</p>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={studentYearFilter}
                  onChange={(event) => setStudentYearFilter(event.target.value)}
                >
                  {[1, 2, 3, 4].map((num) => (
                    <option key={num} value={num.toString()}>
                      Year {num}
                      {studentYear === num ? " (My Year)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-2xl font-bold">{notes.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary" />
            </CardContent>
          </Card>

          <Card className="border-none shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assignments</p>
                <p className="text-2xl font-bold">{assignments.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center py-4">
          <div className="inline-flex p-1.5 bg-muted/40 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm gap-1">
            <Button
              type="button"
              variant={activeContent === "notes" ? "default" : "ghost"}
              className={`min-w-32 rounded-xl transition-all duration-200 ${
                activeContent === "notes" 
                  ? "shadow-md bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveContent("notes")}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Notes
            </Button>
            <Button
              type="button"
              variant={activeContent === "assignments" ? "default" : "ghost"}
              className={`min-w-32 rounded-xl transition-all duration-200 ${
                activeContent === "assignments" 
                  ? "shadow-md bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveContent("assignments")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Assignments
            </Button>
          </div>
        </div>
      </div>

      {adminView && (
        <div className="grid grid-cols-1 gap-6">
          {activeContent === "notes" && (
          <Card className="border-none shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Update Notes
              </CardTitle>
              <CardDescription>Post class notes, circulars, or announcements for students.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleAddNote}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={noteForm.subject}
                  onChange={(event) => setNoteForm((current) => ({ ...current, subject: event.target.value }))}
                >
                  <option value="">Select subject</option>
                  {SUBJECT_OPTIONS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={noteForm.year}
                  onChange={(event) => setNoteForm((current) => ({ ...current, year: event.target.value }))}
                >
                  <option value="">Select year</option>
                  {[1, 2, 3, 4].map((num) => (
                    <option key={num} value={num.toString()}>
                      Year {num}
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="Note title"
                  value={noteForm.title}
                  onChange={(event) => setNoteForm((current) => ({ ...current, title: event.target.value }))}
                />

                <Textarea
                  className="min-h-32"
                  placeholder="Write the note here"
                  value={noteForm.content}
                  onChange={(event) => setNoteForm((current) => ({ ...current, content: event.target.value }))}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Note PDF</label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setNotePdfFile(event.target.files?.[0] ?? null)}
                  />
                </div>

                <Button type="submit" disabled={savingNote}>
                  {savingNote ? "Publishing..." : "Publish Note"}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}

          {activeContent === "assignments" && (
          <Card className="border-none shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Create Assignment
              </CardTitle>
              <CardDescription>
                Add assignment questions, set deadline, and target by year and section.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateAssignment}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={assignmentForm.subjectId}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, subjectId: event.target.value }))}
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="Assignment title"
                  value={assignmentForm.title}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))}
                />

                <Textarea
                  placeholder="Assignment question / instructions"
                  value={assignmentForm.description}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deadline</label>
                    <Input
                      type="date"
                      value={assignmentForm.dueDate}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Maximum Marks</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step="0.5"
                      value={assignmentForm.maxMarks}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, maxMarks: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Year</label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={assignmentForm.targetYear}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, targetYear: event.target.value }))}
                    >
                      <option value="">All Years</option>
                      {[1, 2, 3, 4].map((num) => (
                        <option key={num} value={num.toString()}>
                          Year {num}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Section</label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={assignmentForm.targetSection}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, targetSection: event.target.value }))}
                    >
                      <option value="">All Sections</option>
                      {["A", "B", "C", "D"].map((section) => (
                        <option key={section} value={section}>
                          Section {section}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Department</label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={assignmentForm.targetDepartment}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, targetDepartment: event.target.value }))}
                    >
                      <option value="">All Departments</option>
                      {DEPARTMENT_OPTIONS.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Question Attachment (optional)</label>
                  <Input
                    type="file"
                    onChange={(event) => setAssignmentQuestionFile(event.target.files?.[0] ?? null)}
                  />
                </div>

                <Button type="submit" disabled={savingAssignment}>
                  {savingAssignment ? "Posting..." : "Post Assignment"}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}
        </div>
      )}

      {activeContent === "assignments" && (
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {adminView ? "Assignments" : "Pending Assignments"}
            </CardTitle>
            <CardDescription>
              {adminView
                ? "Review student submissions and grade directly from this page."
                : `Submit your responses as ${currentUserName}${studentDepartment || studentYear ? ` (${studentDepartment || "Unknown Dept"}${studentYear ? `, Year ${studentYear}` : ""}${studentSection ? `, Section ${studentSection}` : ""})` : ""}. Once graded, submissions move to Completed Assignments and cannot be changed.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAssignments ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                Loading assignments...
              </div>
            ) : visibleAssignments.length > 0 ? (
              visibleAssignments.map((assignment) => {
                const deadline = getDeadlineMeta(assignment.dueDate);
                const mySubmission = !adminView ? assignment.submissions[0] : null;
                const submissionLocked = Boolean(mySubmission?.gradedAt);

                return (
                  <div key={assignment.id} className="rounded-xl border bg-muted/20 p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{assignment.subjectName}</Badge>
                          <Badge variant="outline">{assignment.subjectCode}</Badge>
                          <Badge variant="outline">
                            {assignment.targetYear ? `Year ${assignment.targetYear}` : "All Years"}
                          </Badge>
                          <Badge variant="outline">
                            {assignment.targetSection && assignment.targetSection !== "ALL"
                              ? `Section ${assignment.targetSection}`
                              : "All Sections"}
                          </Badge>
                          <Badge variant="outline">
                            {assignment.targetDepartment && assignment.targetDepartment !== "ALL"
                              ? assignment.targetDepartment
                              : "All Departments"}
                          </Badge>
                          <Badge variant={deadline.variant}>{deadline.label}</Badge>
                        </div>

                        <h3 className="font-semibold">{assignment.title}</h3>

                        {assignment.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{assignment.description}</p>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Posted by {assignment.createdBy} on {new Date(assignment.createdAt).toLocaleString()} | Max Marks {assignment.maxMarks}
                        </div>
                      </div>

                      {assignment.attachmentPath && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 gap-2"
                          onClick={() => openAssignmentFile(assignment.attachmentPath)}
                        >
                          <Download className="w-4 h-4" />
                          {assignment.attachmentName || "Question File"}
                        </Button>
                      )}
                    </div>

                    {!adminView && (
                      <div className="rounded-lg border bg-background p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">Your Submission</p>

                          {mySubmission?.submittedAt ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Submitted {new Date(mySubmission.submittedAt).toLocaleString()}
                            </Badge>
                          ) : (
                            <Badge variant={deadline.overdue ? "destructive" : "outline"} className="gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {deadline.overdue ? "Late" : "Not submitted"}
                            </Badge>
                          )}
                        </div>

                        <Textarea
                          placeholder="Write your answer or short notes"
                          value={submissionDrafts[assignment.id]?.text || ""}
                          disabled={submissionLocked}
                          onChange={(event) =>
                            setSubmissionDrafts((current) => ({
                              ...current,
                              [assignment.id]: {
                                text: event.target.value,
                                file: current[assignment.id]?.file || null,
                              },
                            }))
                          }
                        />

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Upload file (optional)</label>
                          <Input
                            type="file"
                            disabled={submissionLocked}
                            onChange={(event) =>
                              setSubmissionDrafts((current) => ({
                                ...current,
                                [assignment.id]: {
                                  text: current[assignment.id]?.text || "",
                                  file: event.target.files?.[0] ?? null,
                                },
                              }))
                            }
                          />

                          {mySubmission?.filePath && (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-xs"
                              onClick={() => openAssignmentFile(mySubmission.filePath)}
                            >
                              Open latest submission file ({mySubmission.fileName || "attachment"})
                            </Button>
                          )}
                        </div>

                        {mySubmission?.gradedAt && (
                          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                            <p>
                              <span className="font-medium">Grade:</span>{" "}
                              {mySubmission.marksObtained == null ? "Not set" : `${mySubmission.marksObtained}/${assignment.maxMarks}`}
                            </p>
                            <p>
                              <span className="font-medium">Feedback:</span> {mySubmission.feedback || "No feedback yet"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Graded on {new Date(mySubmission.gradedAt).toLocaleString()}
                            </p>
                          </div>
                        )}

                        <Button
                          type="button"
                          className="gap-2"
                          disabled={submissionLocked || submittingAssignmentId === assignment.id}
                          onClick={() => handleSubmitAssignment(assignment)}
                        >
                          <Upload className="w-4 h-4" />
                          {submittingAssignmentId === assignment.id
                            ? "Submitting..."
                            : submissionLocked
                              ? "Submission Locked"
                            : mySubmission
                              ? "Update Submission"
                              : "Submit Assignment"}
                        </Button>
                      </div>
                    )}

                    {adminView && (
                      <div className="rounded-lg border bg-background p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Student Responses</p>
                          <Badge variant="outline">{assignment.submissions.length} submissions</Badge>
                        </div>

                        {assignment.submissions.length === 0 ? (
                          <div className="rounded-md border border-dashed p-6 text-sm text-center text-muted-foreground">
                            No responses yet.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {assignment.submissions.map((submission) => (
                              <div key={submission.id} className="rounded-md border p-3 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="font-medium">{submission.studentName}</p>
                                    <p className="text-xs text-muted-foreground">Reg No: {submission.registerNo}</p>
                                  </div>

                                  <p className="text-xs text-muted-foreground">
                                    Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "-"}
                                  </p>
                                </div>

                                {submission.submissionText && (
                                  <p className="text-sm whitespace-pre-line">{submission.submissionText}</p>
                                )}

                                {submission.filePath && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 gap-2"
                                    onClick={() => openAssignmentFile(submission.filePath)}
                                  >
                                    <Download className="w-4 h-4" />
                                    {submission.fileName || "Open attachment"}
                                  </Button>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={assignment.maxMarks}
                                    step="0.5"
                                    value={gradeDrafts[submission.id]?.marks || ""}
                                    onChange={(event) =>
                                      setGradeDrafts((current) => ({
                                        ...current,
                                        [submission.id]: {
                                          marks: event.target.value,
                                          feedback: current[submission.id]?.feedback || "",
                                        },
                                      }))
                                    }
                                    placeholder={`Marks out of ${assignment.maxMarks}`}
                                  />

                                  <Textarea
                                    value={gradeDrafts[submission.id]?.feedback || ""}
                                    onChange={(event) =>
                                      setGradeDrafts((current) => ({
                                        ...current,
                                        [submission.id]: {
                                          marks: current[submission.id]?.marks || "",
                                          feedback: event.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="Feedback"
                                  />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs text-muted-foreground">
                                    {submission.gradedAt
                                      ? `Last graded: ${new Date(submission.gradedAt).toLocaleString()}`
                                      : "Not graded yet"}
                                  </p>

                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={gradingSubmissionId === submission.id}
                                    onClick={() => handleGradeSubmission(assignment, submission)}
                                  >
                                    {gradingSubmissionId === submission.id ? "Saving..." : "Save Grade"}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                {adminView ? "No assignments available right now." : "No pending assignments right now."}
              </div>
            )}
          </CardContent>
        </Card>

        {!adminView && !loadingAssignments && (
          <Card className="border-none shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Completed Assignments
              </CardTitle>
              <CardDescription>
                Graded submissions are read-only and shown here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {studentCompletedAssignments.length > 0 ? (
                studentCompletedAssignments.map((assignment) => {
                  const submission = assignment.submissions[0];
                  return (
                    <div key={assignment.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{assignment.subjectName}</Badge>
                            <Badge variant="outline">{assignment.subjectCode}</Badge>
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed
                            </Badge>
                          </div>
                          <h3 className="mt-2 font-semibold">{assignment.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Graded {submission?.gradedAt ? new Date(submission.gradedAt).toLocaleString() : "-"}
                        </p>
                      </div>

                      {submission?.submissionText && (
                        <p className="text-sm whitespace-pre-line">{submission.submissionText}</p>
                      )}

                      <div className="rounded-md border bg-background p-3 text-sm space-y-1">
                        <p>
                          <span className="font-medium">Grade:</span>{" "}
                          {submission?.marksObtained == null ? "Not set" : `${submission.marksObtained}/${assignment.maxMarks}`}
                        </p>
                        <p>
                          <span className="font-medium">Feedback:</span> {submission?.feedback || "No feedback yet"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {assignment.attachmentPath && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 gap-2"
                            onClick={() => openAssignmentFile(assignment.attachmentPath)}
                          >
                            <Download className="w-4 h-4" />
                            {assignment.attachmentName || "Question File"}
                          </Button>
                        )}
                        {submission?.filePath && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 gap-2"
                            onClick={() => openAssignmentFile(submission.filePath)}
                          >
                            <Download className="w-4 h-4" />
                            {submission.fileName || "Submitted File"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                  No completed assignments yet.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {activeContent === "notes" && (
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Uploaded Notes
            </CardTitle>
            <CardDescription>Latest notes posted by faculty and staff.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingNotes ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                Loading notes...
              </div>
            ) : notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{note.subject}</Badge>
                        <Badge variant="outline">Year {note.year}</Badge>
                      </div>
                      <h3 className="mt-2 font-semibold">{note.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock3 className="w-3.5 h-3.5" />
                      {new Date(note.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{note.content}</p>
                  <p className="text-xs text-muted-foreground">Posted by {note.createdBy}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto w-fit p-0 text-xs font-medium text-primary"
                      onClick={() => openPdfPreview(`${note.title} - ${note.subject}`, note.pdfUrl)}
                    >
                      Open PDF ({note.pdfName})
                    </Button>
                    {adminView && (
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-8 gap-2"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                No notes have been uploaded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      <Separator />

      <Dialog
        open={previewPdf.open}
        onOpenChange={(open) => setPreviewPdf((current) => ({ ...current, open }))}
      >
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewPdf.title || "PDF Preview"}</DialogTitle>
            <DialogDescription>Preview the uploaded PDF inside the app.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 rounded-lg border bg-muted/20 overflow-hidden">
            {previewSrc ? (
              <iframe
                title={previewPdf.title || "PDF preview"}
                src={previewSrc}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No PDF selected.
              </div>
            )}
          </div>
          {previewPdf.url && (
            <div className="flex justify-end">
              <a
                href={previewPdf.url}
                download={`${(previewPdf.title || "document").replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "_")}.pdf`}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Download PDF
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Moodle;