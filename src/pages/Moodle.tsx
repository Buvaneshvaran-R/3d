import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, FileText, Upload, Users, Clock3, MessageSquare, ClipboardList, Trash2 } from "lucide-react";

const SUBJECT_OPTIONS = ["Python", "Data Structure", "C Program"] as const;

type MoodleNote = {
  id: string;
  subject: string;
  title: string;
  content: string;
  pdfName: string;
  pdfDataUrl: string;
  createdAt: string;
  createdBy: string;
};

type MoodleAssignment = {
  id: string;
  subject: string;
  title: string;
  description: string;
  pdfName: string;
  pdfDataUrl: string;
  dueDate: string;
  createdAt: string;
  createdBy: string;
};

type MoodleSubmission = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  subject: string;
  fileName: string;
  pdfDataUrl: string;
  comment: string;
  submittedAt: string;
  studentId: string;
  studentName: string;
};
const NOTE_KEY = "moodle_notes";
const ASSIGNMENT_KEY = "moodle_assignments";
const SUBMISSION_KEY = "moodle_submissions";

const emptyNoteForm = {
  subject: "",
  title: "",
  content: "",
};

const emptyAssignmentForm = {
  subject: "",
  title: "",
  description: "",
  dueDate: "",
};

const emptySubmissionForm = {
  assignmentId: "",
  comment: "",
};

const readPdfFile = (file: File) =>
  new Promise<{ pdfName: string; pdfDataUrl: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ pdfName: file.name, pdfDataUrl: String(reader.result || "") });
    };
    reader.onerror = () => reject(new Error("Unable to read PDF file."));
    reader.readAsDataURL(file);
  });

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

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const Moodle = () => {
  const { user, isAdmin } = useAuth();
  const [notes, setNotes] = useState<MoodleNote[]>([]);
  const [assignments, setAssignments] = useState<MoodleAssignment[]>([]);
  const [submissions, setSubmissions] = useState<MoodleSubmission[]>([]);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [submissionForm, setSubmissionForm] = useState(emptySubmissionForm);
  const [notePdfFile, setNotePdfFile] = useState<File | null>(null);
  const [assignmentPdfFile, setAssignmentPdfFile] = useState<File | null>(null);
  const [submissionPdfFile, setSubmissionPdfFile] = useState<File | null>(null);
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

  useEffect(() => {
    setNotes(loadJson<MoodleNote[]>(NOTE_KEY, []));
    setAssignments(loadJson<MoodleAssignment[]>(ASSIGNMENT_KEY, []));
    setSubmissions(loadJson<MoodleSubmission[]>(SUBMISSION_KEY, []));
  }, []);

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

  const persistNotes = (nextNotes: MoodleNote[]) => {
    localStorage.setItem(NOTE_KEY, JSON.stringify(nextNotes));
    setNotes(nextNotes);
  };

  const persistAssignments = (nextAssignments: MoodleAssignment[]) => {
    localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(nextAssignments));
    setAssignments(nextAssignments);
  };

  const persistSubmissions = (nextSubmissions: MoodleSubmission[]) => {
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(nextSubmissions));
    setSubmissions(nextSubmissions);
  };

  const currentUserName = user?.name || user?.email || "Student";

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === submissionForm.assignmentId),
    [assignments, submissionForm.assignmentId]
  );

  const handleAddNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteForm.subject.trim() || !noteForm.title.trim() || !noteForm.content.trim() || !notePdfFile) {
      return;
    }

    const pdf = await readPdfFile(notePdfFile);

    const nextNote: MoodleNote = {
      id: crypto.randomUUID(),
      subject: noteForm.subject.trim(),
      title: noteForm.title.trim(),
      content: noteForm.content.trim(),
      pdfName: pdf.pdfName,
      pdfDataUrl: pdf.pdfDataUrl,
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
    };

    persistNotes([nextNote, ...notes]);
    setNoteForm(emptyNoteForm);
    setNotePdfFile(null);
  };

  const handleAddAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignmentForm.subject.trim() || !assignmentForm.title.trim() || !assignmentForm.description.trim() || !assignmentForm.dueDate || !assignmentPdfFile) {
      return;
    }

    const pdf = await readPdfFile(assignmentPdfFile);

    const nextAssignment: MoodleAssignment = {
      id: crypto.randomUUID(),
      subject: assignmentForm.subject.trim(),
      title: assignmentForm.title.trim(),
      description: assignmentForm.description.trim(),
      pdfName: pdf.pdfName,
      pdfDataUrl: pdf.pdfDataUrl,
      dueDate: assignmentForm.dueDate,
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
    };

    persistAssignments([nextAssignment, ...assignments]);
    setAssignmentForm(emptyAssignmentForm);
    setAssignmentPdfFile(null);
  };

  const handleDeleteNote = (noteId: string) => {
    const nextNotes = notes.filter((note) => note.id !== noteId);
    persistNotes(nextNotes);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    const nextAssignments = assignments.filter((assignment) => assignment.id !== assignmentId);
    const nextSubmissions = submissions.filter((submission) => submission.assignmentId !== assignmentId);

    persistAssignments(nextAssignments);
    persistSubmissions(nextSubmissions);

    if (submissionForm.assignmentId === assignmentId) {
      setSubmissionForm(emptySubmissionForm);
      setSubmissionPdfFile(null);
    }
  };

  const handleSubmitAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !selectedAssignment || !submissionForm.comment.trim() || !submissionPdfFile) {
      return;
    }

    const pdf = await readPdfFile(submissionPdfFile);

    const nextSubmission: MoodleSubmission = {
      id: crypto.randomUUID(),
      assignmentId: selectedAssignment.id,
      assignmentTitle: selectedAssignment.title,
      subject: selectedAssignment.subject,
      fileName: pdf.pdfName,
      pdfDataUrl: pdf.pdfDataUrl,
      comment: submissionForm.comment.trim(),
      submittedAt: new Date().toISOString(),
      studentId: user.id,
      studentName: currentUserName,
    };

    persistSubmissions([nextSubmission, ...submissions]);
    setSubmissionForm(emptySubmissionForm);
    setSubmissionPdfFile(null);
  };

  const mySubmissions = submissions.filter((submission) => submission.studentId === user?.id);

  const openPdfPreview = (title: string, url: string) => {
    setPreviewPdf({ open: true, title, url });
  };

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
              Admins can publish notes and assignments. Students can view notes and upload assignment submissions.
            </p>
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
              <ClipboardList className="w-8 h-8 text-primary" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-2xl font-bold">{submissions.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </CardContent>
          </Card>
        </div>
      </div>

      {isAdmin() && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                <Input
                  placeholder="Note title"
                  value={noteForm.title}
                  onChange={(event) => setNoteForm((current) => ({ ...current, title: event.target.value }))}
                />
                <textarea
                  className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                <Button type="submit">Publish Note</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Create Assignment
              </CardTitle>
              <CardDescription>Publish a new assignment that students can submit from this page.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleAddAssignment}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={assignmentForm.subject}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, subject: event.target.value }))}
                >
                  <option value="">Select subject</option>
                  {SUBJECT_OPTIONS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Assignment title"
                  value={assignmentForm.title}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))}
                />
                <textarea
                  className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Assignment instructions"
                  value={assignmentForm.description}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))}
                />
                <Input
                  type="date"
                  value={assignmentForm.dueDate}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assignment PDF</label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setAssignmentPdfFile(event.target.files?.[0] ?? null)}
                  />
                </div>
                <Button type="submit">Publish Assignment</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Uploaded Notes
            </CardTitle>
            <CardDescription>Latest notes posted by faculty and staff.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="secondary">{note.subject}</Badge>
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
                      onClick={() => openPdfPreview(`${note.title} - ${note.subject}`, note.pdfDataUrl)}
                    >
                      Open PDF
                    </Button>
                    {isAdmin() && (
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

        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Available Assignments
            </CardTitle>
            <CardDescription>Check assignment details before uploading your submission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline">{assignment.subject}</Badge>
                      <h3 className="mt-2 font-semibold">{assignment.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock3 className="w-3.5 h-3.5" />
                      Due {new Date(assignment.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{assignment.description}</p>
                  <p className="text-xs text-muted-foreground">Created by {assignment.createdBy}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto w-fit p-0 text-xs font-medium text-primary"
                      onClick={() => openPdfPreview(`${assignment.title} - ${assignment.subject}`, assignment.pdfDataUrl)}
                    >
                      Open PDF
                    </Button>
                    {isAdmin() && (
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-8 gap-2"
                        onClick={() => handleDeleteAssignment(assignment.id)}
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
                No assignments are available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Assignment
            </CardTitle>
            <CardDescription>Students can attach a file reference and submit it against an active assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmitAssignment}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignment</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={submissionForm.assignmentId}
                  onChange={(event) => setSubmissionForm((current) => ({ ...current, assignmentId: event.target.value }))}
                >
                  <option value="">Select an assignment</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.title} - {assignment.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Selected assignment</p>
                <p className="mt-1">
                  {selectedAssignment ? selectedAssignment.title : "Choose an assignment above to continue."}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload file reference</label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setSubmissionPdfFile(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">PDF only.</p>
              </div>

              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Add a short comment for the submission"
                value={submissionForm.comment}
                onChange={(event) => setSubmissionForm((current) => ({ ...current, comment: event.target.value }))}
              />

              <Button type="submit" disabled={!selectedAssignment}>
                Submit Assignment
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {isAdmin() ? "All Submissions" : "My Submissions"}
            </CardTitle>
            <CardDescription>
              {isAdmin()
                ? "Review everything students have uploaded for the Moodle assignments."
                : "Track the assignments you have already uploaded from this portal."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(isAdmin() ? submissions : mySubmissions).length > 0 ? (
              (isAdmin() ? submissions : mySubmissions).map((submission) => (
                <div key={submission.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="secondary">{submission.subject}</Badge>
                      <h3 className="mt-2 font-semibold">{submission.assignmentTitle}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock3 className="w-3.5 h-3.5" />
                      {new Date(submission.submittedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>File: {submission.fileName}</p>
                    <p>Comment: {submission.comment}</p>
                    {isAdmin() && <p>Student: {submission.studentName}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto w-fit p-0 text-xs font-medium text-primary"
                    onClick={() => openPdfPreview(`${submission.assignmentTitle} - ${submission.subject}`, submission.pdfDataUrl)}
                  >
                    Open PDF
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                No submissions have been uploaded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
          {!isAdmin() && previewPdf.url && (
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