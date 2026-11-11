import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  User,
  Mail,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
  Hash,
  BookOpen,
  Calendar,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess: (role: 'student' | 'organizer') => void;
}

type PortalType = 'student' | 'organizer';
type AuthMode = 'signin' | 'signup';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Biotechnology',
  'Business Administration',
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, register, logout } = useAuth();

  // Portal & Mode
  const [portal, setPortal] = useState<PortalType>('student');
  const [mode, setMode] = useState<AuthMode>('signin');

  // Student Sign In State
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Student Sign Up State
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentSignUpEmail, setStudentSignUpEmail] = useState('');
  const [studentDept, setStudentDept] = useState('Computer Science');
  const [year, setYear] = useState(1);
  const [studentSignUpPassword, setStudentSignUpPassword] = useState('');
  const [showStudentSignUpPassword, setShowStudentSignUpPassword] = useState(false);

  // Organizer Sign In State
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPassword, setOrgPassword] = useState('');
  const [showOrgPassword, setShowOrgPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchPortal = (newPortal: PortalType) => {
    setPortal(newPortal);
    setMode('signin');
    setError(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
  };

  // Student Sign In Handler
  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim()) {
      setError('Please provide your student email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(studentEmail.trim(), studentPassword);
      onLoginSuccess(user.role);
    } catch (err: any) {
      console.error('Student sign-in failure:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Student Sign Up Handler
  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !rollNumber.trim() || !studentSignUpEmail.trim() || !studentDept.trim()) {
      setError('All fields are required for student registration.');
      return;
    }

    if (studentSignUpPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await register({
        fullName: fullName.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        email: studentSignUpEmail.trim().toLowerCase(),
        department: studentDept.trim(),
        year: Number(year),
        password: studentSignUpPassword,
      });
      onLoginSuccess(user.role);
    } catch (err: any) {
      console.error('Student registration failure:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Student registration failed. Please review the form.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Organizer Sign In Handler
  const handleOrganizerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgEmail.trim()) {
      setError('Please provide your organizer email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(orgEmail.trim(), orgPassword);
      if (user.role !== 'organizer') {
        logout();
        setError('Access denied: This account does not have Organizer privileges.');
        return;
      }
      onLoginSuccess('organizer');
    } catch (err: any) {
      console.error('Organizer sign-in failure:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Organizer authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
        {/* Brand Header */}
        <div
          className={`px-6 py-6 text-center text-white relative transition-colors duration-300 ${
            portal === 'organizer'
              ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800'
              : 'bg-gradient-to-r from-brand-600 to-indigo-600'
          }`}
        >
          <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-2.5 shadow-lg">
            {portal === 'organizer' ? (
              <Building2 className="w-7 h-7 text-purple-200" />
            ) : (
              <GraduationCap className="w-7 h-7 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight">EventSphere</h1>
          <p className="text-xs text-indigo-100 font-medium mt-0.5">
            College Event Management System • Institutional Portal
          </p>
        </div>

        {/* Primary Account Type Selector: Student vs Organizer */}
        <div className="px-6 pt-5 pb-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
            Select Portal Access
          </div>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => switchPortal('student')}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                portal === 'student'
                  ? 'bg-white text-brand-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-brand-600" />
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              onClick={() => switchPortal('organizer')}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                portal === 'organizer'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className={`w-4 h-4 ${portal === 'organizer' ? 'text-white' : 'text-purple-600'}`} />
              <span>Organizer Portal</span>
            </button>
          </div>
        </div>

        {/* Secondary Mode Switcher: Shown ONLY for Student Portal (Organizer registration locked down) */}
        {portal === 'student' && (
          <div className="px-6 pt-2 pb-1">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5 ${
                  mode === 'signin'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5 ${
                  mode === 'signup'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Student Sign Up</span>
              </button>
            </div>
          </div>
        )}

        <div className="p-6 pt-4 space-y-4">
          {/* Section Description */}
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {portal === 'organizer'
                ? 'Organizer Sign In'
                : mode === 'signin'
                ? 'Student Sign In'
                : 'Student Self-Registration'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {portal === 'organizer'
                ? 'Sign in with authorized institutional credentials to manage campus events, rosters, and analytics.'
                : mode === 'signin'
                ? 'Sign in to discover events, register for seats, and view your tickets.'
                : 'Create your student account with verified institutional credentials.'}
            </p>
          </div>

          {/* Portal Context Banner */}
          {portal === 'organizer' ? (
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center space-x-2 text-xs text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Organizer Privileges:</strong> Event Creation, Attendee Rosters, & Live Aggregation Analytics.
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center space-x-2 text-xs text-blue-900">
              <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Student Privileges:</strong> Instant seat registration & personalized registration tracking.
              </span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. STUDENT SIGN IN */}
          {/* ========================================================================= */}
          {portal === 'student' && mode === 'signin' && (
            <form onSubmit={handleStudentSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showStudentPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showStudentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating student...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In to Student Portal</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 2. STUDENT SIGN UP */}
          {/* ========================================================================= */}
          {portal === 'student' && mode === 'signup' && (
            <form onSubmit={handleStudentSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g., Alex Rivers"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Roll Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g., CS-2024-042"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g., alex.rivers@college.edu"
                    value={studentSignUpEmail}
                    onChange={(e) => setStudentSignUpEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={studentDept}
                      onChange={(e) => setStudentDept(e.target.value)}
                      className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Year of Study
                  </label>
                  <div className="relative">
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value={1}>Year 1 (Freshman)</option>
                      <option value={2}>Year 2 (Sophomore)</option>
                      <option value={3}>Year 3 (Junior)</option>
                      <option value={4}>Year 4 (Senior)</option>
                      <option value={5}>Year 5 (Graduate)</option>
                    </select>
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showStudentSignUpPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Create a secure password"
                    value={studentSignUpPassword}
                    onChange={(e) => setStudentSignUpPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowStudentSignUpPassword(!showStudentSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showStudentSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Registering student account...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Student Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 3. ORGANIZER SIGN IN (SIGN-UP LOCKED DOWN) */}
          {/* ========================================================================= */}
          {portal === 'organizer' && (
            <form onSubmit={handleOrganizerSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Organizer Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="organizer@college.edu"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showOrgPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={orgPassword}
                    onChange={(e) => setOrgPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowOrgPassword(!showOrgPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOrgPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] font-medium text-purple-700 bg-purple-50/70 border border-purple-100 rounded-lg px-3 py-1.5">
                Institutional Access: <code className="font-mono font-semibold">organizer@college.edu</code>
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating organizer...</span>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>Sign In to Organizer Dashboard</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mode Switch Prompt */}
          <div className="text-center pt-2 border-t border-slate-100">
            {portal === 'student' ? (
              mode === 'signin' ? (
                <p className="text-xs text-slate-500">
                  New student at the university?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-brand-600 hover:text-brand-700 underline"
                  >
                    Create student account
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Already registered as a student?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-bold text-brand-600 hover:text-brand-700 underline"
                  >
                    Sign In here
                  </button>
                </p>
              )
            ) : (
              <p className="text-[11px] text-slate-500">
                Organizer accounts are provisioned by Campus Administration.
              </p>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              Role-Based Access Control • Cryptographic JWT Tokens
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
