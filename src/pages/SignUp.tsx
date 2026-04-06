import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserCircle, Mail, Lock, Phone, Calendar, Building2, Hash, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import loginLogo from "@/assets/final.avif";

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Student-specific fields
  const [registerNo, setRegisterNo] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [currentYear, setCurrentYear] = useState("");

  // Admin-specific fields
  const [designation, setDesignation] = useState("");

  // Department section mapping
  const departmentSections: Record<string, string[]> = {
    "Artificial Intelligence and Data Science": ["A", "B", "C", "D", "E", "F"],
    "Computer Science and Engineering": ["A", "B", "C", "D", "E", "F", "G"],
    "Electronics and Communication Engineering": ["A", "B", "C"],
    "Mechanical Engineering": ["A", "B"],
    "Bio Technology": ["A", "B"],
    "Computer and Communication Engineering": ["A", "B"],
    "VLSI Design": ["A", "B"],
    "Artificial Intelligence and Machine Learning": ["A", "B", "C"],
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validate password
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Prepare metadata based on role
      const metadata: { name?: string; phone?: string; designation?: string; department?: string; register_no?: string; date_of_birth?: string; gender?: string; blood_group?: string; batch?: string; semester?: number; section?: string; current_year?: number } = { name, phone };

      if (isAdmin) {
        // Admin signup - email must be admin@rit.edu or similar
        if (!email.includes('admin')) {
          throw new Error("Admin email must contain 'admin' (e.g., admin@rit.edu)");
        }
        if (!designation || !department) {
          throw new Error("Please fill in all admin details including designation and department");
        }
        metadata.designation = designation;
        metadata.department = department;
      } else {
        // Student signup
        if (!registerNo || !dateOfBirth || !gender || !bloodGroup || !department || !batch || !semester || !section || !currentYear) {
          throw new Error("Please fill in all student details including blood group");
        }

        metadata.register_no = registerNo;
        metadata.date_of_birth = dateOfBirth;
        metadata.gender = gender;
        metadata.blood_group = bloodGroup;
        metadata.department = department;
        metadata.batch = batch;
        metadata.semester = parseInt(semester);
        metadata.section = section;
        metadata.current_year = parseInt(currentYear);
      }

      // Sign up with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (signUpError) throw signUpError;

      setSuccess(
        "Account created successfully! " +
        (data.user?.identities?.length === 0
          ? "Please check your email to confirm your account."
          : "You can now login.")
      );

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: Error | unknown) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-5xl bg-card rounded-2xl shadow-elevated overflow-hidden flex animate-fade-in">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-2/5 gradient-primary flex-col items-center justify-center p-12 text-primary-foreground">
          <div className="w-28 h-28 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center mb-8 border-2 border-primary-foreground/20">
            <div className="w-24 h-24 rounded-full bg-primary-foreground flex items-center justify-center">
              <img src={loginLogo} alt="RIT Logo" className="w-16 h-16 object-contain" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">RIT</h1>
          <h2 className="text-lg font-semibold text-center mb-4">
            Rajalakshmi Institute of Technology
          </h2>
          <p className="text-sm text-center text-primary-foreground/80 mb-2">
            An Autonomous Institution
          </p>
          <div className="mt-4 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm">
            <p className="text-xs font-medium text-center">Accredited with A++ Grade in NAAC</p>
          </div>
        </div>

        {/* Right Panel - Signup Form */}
        <div className="w-full lg:w-3/5 p-6 md:p-10 flex flex-col justify-center max-h-screen overflow-y-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-3">
              <img src={loginLogo} alt="RIT Logo" className="w-10 h-10 object-contain" />
            </div>
            <h2 className="text-lg font-bold text-foreground">RIT Chennai</h2>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">Create Account</h2>
            <p className="text-muted-foreground text-sm">
              Join RIT Student Portal - Fill in your details to get started
            </p>
          </div>

          {/* Role Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setIsAdmin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isAdmin
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Student Signup
            </button>
            <button
              type="button"
              onClick={() => setIsAdmin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isAdmin
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Admin Signup
            </button>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Common Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                  <UserCircle className="w-4 h-4" /> Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={isAdmin ? "admin@rit.edu" : "student@rit.edu"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Student-Specific Fields */}
            {!isAdmin && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registerNo" className="text-sm font-medium flex items-center gap-2">
                      <Hash className="w-4 h-4" /> Register Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="registerNo"
                      placeholder="e.g., 2022CS001"
                      value={registerNo}
                      onChange={(e) => setRegisterNo(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Date of Birth <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium">Gender <span className="text-destructive">*</span></Label>
                    <Select value={gender} onValueChange={setGender} required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup" className="text-sm font-medium">Blood Group <span className="text-destructive">*</span></Label>
                    <Select value={bloodGroup} onValueChange={setBloodGroup} required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="section" className="text-sm font-medium">Section <span className="text-destructive">*</span></Label>
                    <Select value={section} onValueChange={setSection} required disabled={!department}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={department ? "Select section" : "Select department first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {department && departmentSections[department]?.map((sec) => (
                          <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Department <span className="text-destructive">*</span>
                    </Label>
                    <Select value={department} onValueChange={setDepartment} required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Artificial Intelligence and Data Science">AIDS</SelectItem>
                        <SelectItem value="Computer Science and Engineering">CSE</SelectItem>
                        <SelectItem value="Electronics and Communication Engineering">ECE</SelectItem>
                        <SelectItem value="Mechanical Engineering">MECH</SelectItem>
                        <SelectItem value="Bio Technology">BIO TECH</SelectItem>
                        <SelectItem value="Computer and Communication Engineering">CCE</SelectItem>
                        <SelectItem value="VLSI Design">VLSI</SelectItem>
                        <SelectItem value="Artificial Intelligence and Machine Learning">AIML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch" className="text-sm font-medium">Batch <span className="text-destructive">*</span></Label>
                    <Input
                      id="batch"
                      placeholder="e.g., 2022-2026"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="semester" className="text-sm font-medium">Current Semester <span className="text-destructive">*</span></Label>
                    <Select value={semester} onValueChange={setSemester} required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentYear" className="text-sm font-medium">Current Year <span className="text-destructive">*</span></Label>
                    <Select value={currentYear} onValueChange={setCurrentYear} required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((year) => (
                          <SelectItem key={year} value={year.toString()}>Year {year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Admin-Specific Fields */}
            {isAdmin && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designation" className="text-sm font-medium">Designation <span className="text-destructive">*</span></Label>
                  <Input
                    id="designation"
                    placeholder="e.g., Academic Officer"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminDept" className="text-sm font-medium">Department <span className="text-destructive">*</span></Label>
                  <Input
                    id="adminDept"
                    placeholder="e.g., Administration"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-lg gradient-primary text-primary-foreground font-semibold shadow-lg hover:opacity-90"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Login here
              </button>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © 2024 Rajalakshmi Institute of Technology. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
