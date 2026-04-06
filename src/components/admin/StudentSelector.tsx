import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";

type TeacherSearchRow = { user_id: string; name: string; department: string | null };

export const StudentSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [teachers, setTeachers] = useState<TeacherSearchRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch teachers from database when search query changes
  useEffect(() => {
    const fetchTeachers = async () => {
      if (searchQuery.length < 2) {
        setTeachers([]);
        return;
      }

      setLoading(true);
      try {
        const searchTerm = `%${searchQuery}%`;
        const { data, error } = await supabase
          .from("admins")
          .select("user_id, name, department")
          .ilike("name", searchTerm)
          .limit(10);

        if (error) throw error;
        setTeachers((data || []) as TeacherSearchRow[]);

        setShowResults(true);
      } catch (error) {
        console.error("Error fetching search results:", error);
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchTeachers();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectTeacher = (teacher: TeacherSearchRow) => {
    window.dispatchEvent(new CustomEvent("rit:teacher-search", { detail: { name: teacher.name } }));
    if (location.pathname !== "/smart-classroom") {
      navigate("/smart-classroom");
    }
    setShowResults(false);
    setSearchQuery(teacher.name);
  };

  return (
    <div className="mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search teacher by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                onFocus={() => {
                  if (searchQuery.length > 0) {
                    setShowResults(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding to allow click on results
                  setTimeout(() => setShowResults(false), 200);
                }}
                className="pl-10"
              />
            </div>

              {showResults && loading && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                </div>
              )}

              {showResults && !loading && teachers.length > 0 && (
                <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
                  {teachers.map((teacher) => (
                    <button
                      key={teacher.user_id}
                      onClick={() => handleSelectTeacher(teacher)}
                      className="w-full text-left p-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                    >
                      <p className="font-medium text-foreground">{teacher.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {teacher.department || "Department N/A"} • Open in Smart Classroom
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {showResults && !loading && searchQuery.length >= 2 && teachers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No teachers found matching "{searchQuery}"
                </p>
              )}
              
              {showResults && !loading && searchQuery.length < 2 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Type at least 2 characters to search
                </p>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
