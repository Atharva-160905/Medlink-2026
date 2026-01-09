import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Activity, Users, FileText, CheckCircle, Brain, Lock, Upload, Sparkles, UserCheck } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden font-sans">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] opacity-60 animate-pulse" />
                <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px] opacity-60 animate-pulse delay-700" />
                <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[100px] opacity-60 animate-pulse delay-1000" />
            </div>

            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-md shadow-indigo-500/20">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700">
                                MedLink
                            </span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#how-it-works" className="text-slate-500 hover:text-indigo-600 font-medium transition-colors">How it Works</a>
                            <a href="#for-doctors" className="text-slate-500 hover:text-indigo-600 font-medium transition-colors">For Doctors</a>
                            <a href="#safety" className="text-slate-500 hover:text-indigo-600 font-medium transition-colors">Safety</a>
                        </div>
                        <div className="flex space-x-4">
                            <Link to="/login" className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 transition-colors">
                                Login
                            </Link>
                            <Link to="/signup" className="bg-slate-900 text-white px-5 py-2 rounded-xl hover:bg-slate-800 font-medium transition-all shadow-lg shadow-slate-900/20 transform active:scale-95">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">

                {/* HERO SECTION */}
                <div className="text-center max-w-5xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold mb-8 shadow-sm">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <span>Understand your health data safely</span>
                    </div>

                    <h1 className="text-4xl sm:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1]">
                        Understand medical reports. <br className="hidden sm:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Share securely</span> with your doctor.
                    </h1>

                    <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-12 leading-relaxed">
                        Get clear AI explanations for your lab results and share them securely with your doctor.
                        <span className="font-semibold block mt-3 text-indigo-700">AI clarifies the jargon. Your doctor provides the care.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Link to="/signup?role=patient" className="group px-8 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:-translate-y-1">
                            <span className="mr-2">I am a Patient</span>
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link to="/signup?role=doctor" className="group px-8 py-5 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:border-indigo-200 hover:bg-indigo-50/50 transition-all shadow-lg shadow-slate-200/50 flex items-center justify-center hover:-translate-y-1">
                            <span className="mr-2">I am a Doctor</span>
                            <Users className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* HOW IT WORKS */}
                <div id="how-it-works" className="my-32">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">How MedLink Works</h2>
                        <p className="text-slate-500">Simple, secure, and effective workflow.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {/* Connector Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent z-0"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center text-center group">
                            <div className="h-24 w-24 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Upload className="h-10 w-10 text-blue-500" />
                            </div>
                            <div className="absolute -top-3 right-[calc(50%-40px)] bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">STEP 1</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Upload Reports</h3>
                            <p className="text-slate-500 leading-relaxed max-w-xs">Upload your lab reports (PDF/Image). They are encrypted and stored privately in your account.</p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center text-center group">
                            <div className="h-24 w-24 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Brain className="h-10 w-10 text-purple-500" />
                            </div>
                            <div className="absolute -top-3 right-[calc(50%-40px)] bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">STEP 2</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">AI Explains</h3>
                            <p className="text-slate-500 leading-relaxed max-w-xs">MedLink AI simplifies the medical jargon into plain English. It helps you understand, <span className="font-bold text-purple-600">not diagnose</span>.</p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center text-center group">
                            <div className="h-24 w-24 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <UserCheck className="h-10 w-10 text-green-500" />
                            </div>
                            <div className="absolute -top-3 right-[calc(50%-40px)] bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">STEP 3</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Connect Doctor</h3>
                            <p className="text-slate-500 leading-relaxed max-w-xs">Share access with your doctor via a unique code. They get a professional summary and full report access.</p>
                        </div>
                    </div>
                </div>

                {/* USER TYPES SPLIT */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-32">
                    {/* Patient Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-white p-10 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-100/50 relative overflow-hidden group hover:-translate-y-2 transition-transform duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity className="h-64 w-64 text-blue-600 rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-bold text-blue-900 mb-6">For Patients</h3>
                            <ul className="space-y-4">
                                <li className="flex items-start">
                                    <CheckCircle className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-700 text-lg">Understand complex results instantly</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-700 text-lg">Keep a secure digital history of all reports</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-700 text-lg">Prepare better questions for your doctor visit</span>
                                </li>
                            </ul>
                            <div className="mt-10">
                                <Link to="/signup?role=patient" className="text-blue-700 font-bold flex items-center hover:gap-2 transition-all">
                                    Start as Patient <ArrowRight className="h-5 w-5 ml-2" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Doctor Card */}
                    <div id="for-doctors" className="bg-gradient-to-br from-indigo-50 to-white p-10 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-100/50 relative overflow-hidden group hover:-translate-y-2 transition-transform duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="h-64 w-64 text-indigo-600 rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-bold text-indigo-900 mb-6">For Doctors</h3>
                            <ul className="space-y-4">
                                <li className="flex items-start">
                                    <CheckCircle className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-700 text-lg">Quick overview of patient history</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-700 text-lg">Key takeaways highlighted to save time</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-700 text-lg">Unified communication channel with patients</span>
                                </li>
                            </ul>
                            <div className="mt-10">
                                <Link to="/signup?role=doctor" className="text-indigo-700 font-bold flex items-center hover:gap-2 transition-all">
                                    Join as Doctor <ArrowRight className="h-5 w-5 ml-2" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TRUST SECTION */}
                <div id="safety" className="bg-slate-900 text-white rounded-3xl p-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <Shield className="h-16 w-16 text-emerald-400 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold mb-6">Your Safety is Our Priority</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-10">
                            <div>
                                <h4 className="font-bold text-lg mb-2 text-emerald-400">Consent Driven</h4>
                                <p className="text-slate-400 text-sm">You control who sees your data. Revoke access at any time with one click.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-2 text-emerald-400">Understanding Only</h4>
                                <p className="text-slate-400 text-sm">AI provides explanations, never diagnoses. Always consult your doctor.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-2 text-emerald-400">Secure Storage</h4>
                                <p className="text-slate-400 text-sm">Enterprise-grade encryption for all documents and messages.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FINAL CTA */}
                <div className="text-center mt-32 mb-20">
                    <h2 className="text-4xl font-bold text-slate-900 mb-6">Ready to take control?</h2>
                    <p className="text-xl text-slate-500 mb-10">Start for free today. No credit card required.</p>
                    <Link to="/signup" className="inline-flex px-10 py-4 bg-slate-900 text-white rounded-xl font-bold text-xl hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                        Sign Up Now
                    </Link>
                </div>

            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
                    <p>© 2026 MedLink. All rights reserved.</p>
                    <p className="mt-2">Disclaimer: MedLink AI outputs are for informational purposes only and do not constitute medical advice.</p>
                </div>
            </footer>
        </div>
    )
}
