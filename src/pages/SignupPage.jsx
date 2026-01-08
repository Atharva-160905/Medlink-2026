import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Mail, User, Loader2, Activity, ArrowRight, ArrowLeft } from 'lucide-react'

export default function SignupPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const [role, setRole] = useState('patient')
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: ''
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
            // 1. Sign up user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: role
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error("No user created")

            // Profile is created automatically by DB trigger on auth.users

            // Success! Redirect
            if (role === 'doctor') {
                navigate('/doctor')
            } else {
                navigate('/patient')
            }

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
            </div>

            <Link to="/" className="absolute top-8 left-8 text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium z-50 transition-colors">
                <ArrowLeft className="h-5 w-5" /> Back to Home
            </Link>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform duration-300">
                        <Activity className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                        MedLink
                    </span>
                </Link>

                <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Join us and experience modern healthcare
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10 px-4">
                <div className="glass-panel py-10 px-6 sm:px-10 rounded-2xl">

                    {/* Role Toggle */}
                    <div className="mb-8 p-1.5 bg-slate-100/80 rounded-xl flex relative">
                        <div
                            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-lg bg-white shadow-sm transition-all duration-300 ease-out ${role === 'doctor' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setRole('patient')}
                            className={`flex-1 relative z-10 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 ${role === 'patient' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Patient
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('doctor')}
                            className={`flex-1 relative z-10 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 ${role === 'doctor' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Doctor
                        </button>
                    </div>

                    <form className="space-y-6" onSubmit={handleSignup}>
                        {error && (
                            <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
                                <div className="p-1 bg-red-100 rounded-full shrink-0">
                                    <Activity className="h-4 w-4 text-red-600 rotate-45" />
                                </div>
                                <p className="text-sm text-red-600 mt-0.5">{error}</p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    required
                                    className="input-field pl-11"
                                    placeholder={role === 'doctor' ? "Dr. Jane Doe" : "John Doe"}
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                                Email address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="input-field pl-11"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                    className="input-field pl-11"
                                    placeholder="Min 6 characters"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full btn-primary flex items-center justify-center gap-2 ${loading ? 'opacity-80' : ''}`}
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Create account
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-slate-500">
                                    Already have an account?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors duration-200"
                            >
                                Sign in indirectly
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
