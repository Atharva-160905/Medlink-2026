import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Activity, Users } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center">
                            <Activity className="h-8 w-8 text-blue-600" />
                            <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                MedLink
                            </span>
                        </div>
                        <div className="flex space-x-4">
                            <Link to="/login" className="text-gray-600 hover:text-blue-600 font-medium px-4 py-2">
                                Login
                            </Link>
                            <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div className="text-center">
                    <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-8">
                        Securely Link <span className="text-blue-600">Doctors</span> & <span className="text-indigo-600">Patients</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-xl text-gray-500 mb-8">
                        Share medical documents and prescriptions with a simple, secure, and private connection. No more lost papers or insecure emails.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/signup?role=patient" className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center">
                            I'm a Patient <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                        <Link to="/signup?role=doctor" className="px-8 py-4 bg-white text-gray-800 border-2 border-gray-200 rounded-xl font-bold text-lg hover:border-blue-600 hover:text-blue-600 transition-all flex items-center">
                            I'm a Doctor <Users className="ml-2 h-5 w-5" />
                        </Link>
                    </div>
                </div>

                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <Shield className="h-10 w-10 text-green-500 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Private & Secure</h3>
                        <p className="text-gray-500">Your data is encrypted and only accessible to doctors you explicitly link with.</p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <Users className="h-10 w-10 text-blue-500 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Easy Linking</h3>
                        <p className="text-gray-500">Connect using simple unique IDs. No complicated sharing permissions to manage.</p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <Activity className="h-10 w-10 text-indigo-500 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Digital Prescriptions</h3>
                        <p className="text-gray-500">Doctors can issue digital prescriptions instantly available in your dashboard.</p>
                    </div>
                </div>
            </main>
        </div>
    )
}
