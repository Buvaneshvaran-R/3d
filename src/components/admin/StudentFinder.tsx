import { useState, useRef, useEffect } from "react";
import { Search, Loader2, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

export interface StudentSearchResult {
  id: string;
  name: string;
  register_no: string;
  department: string;
  current_year?: string;
  semester?: string;
}

interface StudentFinderProps {
  onStudentSelect: (student: StudentSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function StudentFinder({ onStudentSelect, className = "" }: StudentFinderProps) {
  const [searchBy, setSearchBy] = useState<"register" | "name">("register");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch students automatically when typing
  useEffect(() => {
    const fetchStudents = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        let queryBuilder = supabase
          .from("students")
          .select("id, name, register_no, department, current_year, semester")
          .limit(10);

        if (searchBy === "register") {
          queryBuilder = queryBuilder.ilike("register_no", `%${query.trim()}%`);
        } else {
          queryBuilder = queryBuilder.ilike("name", `%${query.trim()}%`);
        }

        const { data, error } = await queryBuilder;
        if (error) throw error;
        
        setResults(data || []);
        setShowResults(true);
      } catch (error) {
        console.error("Error searching students:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [query, searchBy]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (student: StudentSearchResult) => {
    setQuery(searchBy === "register" ? student.register_no : student.name);
    setShowResults(false);
    onStudentSelect(student);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="flex flex-col sm:flex-row items-center bg-card rounded-xl border border-input shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
        {/* Left Side: Select Dropdown */}
        <div className="border-b sm:border-b-0 sm:border-r border-input w-full sm:w-[180px] bg-muted/20">
          <Select 
            value={searchBy} 
            onValueChange={(val: "register" | "name") => {
              setSearchBy(val);
              setQuery("");
              setResults([]);
            }}
          >
            <SelectTrigger className="border-0 shadow-none focus:ring-0 rounded-none bg-transparent">
              <SelectValue placeholder="Search by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="register">Register Number</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right Side: Input Field */}
        <div className="relative flex-1 w-full bg-transparent flex items-center">
          <div className="pl-4 pr-2 text-muted-foreground flex-shrink-0">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </div>
          <input
            type="text"
            className="flex-1 w-full h-11 bg-transparent border-0 px-2 py-2 text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
            placeholder={searchBy === "register" ? "Search by register number..." : "Search by student name..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.length >= 2) setShowResults(true); }}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {showResults && (
        <div className="absolute top-12 left-0 z-50 w-full mt-2 bg-popover/95 backdrop-blur-md border border-border shadow-lg rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="max-h-[300px] overflow-y-auto w-full p-2 space-y-1">
            {results.length > 0 ? (
              results.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleSelect(student)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/80 focus:bg-muted/80 focus:outline-none transition-colors group flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {student.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {student.register_no} &bull; {student.department}
                    </p>
                  </div>
                  {student.current_year && (
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      Year {student.current_year}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
                <UserX className="h-8 w-8 mb-2 opacity-50" />
                <p>No students found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
