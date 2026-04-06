import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Clock3, MessageSquare, Trash2 } from "lucide-react";

const SUBJECT_OPTIONS = ["Python", "Data Structure", "C Program"] as const;

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

const emptyNoteForm = {
  subject: "",
  year: "",
  title: "",
  content: "",
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
  const adminView = isAdmin();
  const [notes, setNotes] = useState<MoodleNote[]>([]);
  const [studentYear, setStudentYear] = useState<number | null>(null);
  const [studentYearFilter, setStudentYearFilter] = useState<string>("");
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [notePdfFile, setNotePdfFile] = useState<File | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
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
          .select("current_year")
          .eq("user_id", user.id)
          .single();

        if (studentError || !studentData?.current_year) {
          throw studentError || new Error("Student year not found.");
        }

        setStudentYear(studentData.current_year);

        const selectedYear = studentYearFilter
          ? Number(studentYearFilter)
          : studentData.current_year;

        if (!studentYearFilter) {
          setStudentYearFilter(String(studentData.current_year));
        }

        notesQuery = notesQuery.eq("year", selectedYear);
      } else {
        setStudentYear(null);
        if (studentYearFilter) {
          setStudentYearFilter("");
        }
      }

      const { data, error } = await notesQuery.order("created_at", { ascending: false });

      if (error) throw error;

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

  useEffect(() => {
    fetchNotes();
  }, [user?.id, adminView, studentYearFilter]);

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
    } catch (error) {
      console.error("Error adding Moodle note:", error);
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
    } catch (error) {
      console.error("Error deleting Moodle note:", error);
    }
  };

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
              Admins can publish notes. Students can view notes for their year and download PDFs.
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
        </div>
      </div>

      {adminView && (
        <div className="grid grid-cols-1 gap-6">
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
                <Button type="submit" disabled={savingNote}>
                  {savingNote ? "Publishing..." : "Publish Note"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

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
                      Open PDF
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