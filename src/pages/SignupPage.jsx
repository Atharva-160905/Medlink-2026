import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Mail, User, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, Stethoscope, UserCheck } from 'lucide-react'
import Logo from '../components/Logo'

export default function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const [role, setRole] = useState('patient')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'doctor' || roleParam === 'patient') {
      setRole(roleParam)
    }
  }, [searchParams])

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters.')
      }

      // 1. Sign up user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            role: role,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Could not create account. Please try again.')

      // Profile is created automatically by DB trigger on auth.users

      // Success! Redirect to appropriate dashboard
      if (role === 'doctor') {
        navigate('/doctor')
      } else {
        navigate('/patient')
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError(err.message || 'Error creating account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col justify-between py-4 px-3 sm:py-6 sm:px-6 lg:px-8 font-sans selection:bg-teal-100 selection:text-teal-900 relative">
      {/* Top Header / Back Link */}
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-stone-200/60 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Home</span>
        </Link>
        <Link to="/" className="focus:outline-none">
          <Logo size={30} showWordmark={true} />
        </Link>
      </div>

      {/* Main Screen-Fitted Card Container */}
      <div className="w-full max-w-[440px] mx-auto my-auto py-3 sm:py-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-xl shadow-stone-200/60">
          {/* Header */}
          <div className="text-left mb-5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {role === 'patient'
                ? 'Upload and understand lab reports with plain-English clarity.'
                : 'Manage patient records, issue digital prescriptions, and direct chat.'}
            </p>
          </div>

          {/* Role Toggle Selector */}
          <div className="mb-5 bg-stone-100 p-1 rounded-xl border border-stone-200/90 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                role === 'patient'
                  ? 'bg-white text-slate-900 shadow-sm border border-stone-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>I am a Patient</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                role === 'doctor'
                  ? 'bg-white text-slate-900 shadow-sm border border-stone-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>I am a Doctor</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-3.5" onSubmit={handleSignup}>
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="w-full pl-10 pr-3.5 py-2 bg-stone-50/80 border border-stone-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 transition-all"
                  placeholder={role === 'doctor' ? 'Dr. Jane Smith' : 'John Doe'}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-3.5 py-2 bg-stone-50/80 border border-stone-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 transition-all"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2 bg-stone-50/80 border border-stone-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 transition-all"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-5 pt-4 border-t border-stone-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-teal-700 hover:text-teal-800 hover:underline transition-colors ml-1"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Security Trust Micro-Badge */}
        <div className="text-center mt-4">
          <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
            <span>🔒</span> Encrypted Storage • Strict Non-Diagnostic Guardrails
          </p>
        </div>
      </div>

      {/* Subtle Footer */}
      <div className="max-w-7xl mx-auto w-full text-center py-2 text-[11px] text-slate-400">
        © {new Date().getFullYear()} MedLink Healthcare. All rights reserved.
      </div>
    </div>
  )
}
