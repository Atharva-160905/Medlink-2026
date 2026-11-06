import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Lock,
  Upload,
  UserCheck,
  Sparkles,
  ArrowUpRight,
  HelpCircle,
  Stethoscope,
  Eye,
  FileCheck,
  MessageSquare,
  ShieldAlert,
  KeyRound,
  FileSearch,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import Logo from '../components/Logo'

export default function LandingPage() {
  const [activeDemoTab, setActiveDemoTab] = useState('cbc') // 'cbc' or 'lipid'
  const [activePersona, setActivePersona] = useState('patient') // 'patient' or 'doctor'
  const [activeNav, setActiveNav] = useState('interactive-preview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { id: 'interactive-preview', label: 'Report Translation' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'for-clinicians', label: 'For Clinicians' },
    { id: 'safety-guardrails', label: 'Safety & Privacy' },
  ]

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 300) {
        setActiveNav('interactive-preview')
        return
      }

      const scrollPosition = window.scrollY + 220
      for (const link of navLinks) {
        const el = document.getElementById(link.id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveNav(link.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const demoReports = {
    cbc: {
      name: 'Complete Blood Count (CBC)',
      lab: 'Drlogy Pathology Labs',
      date: 'Today, 10:30 AM',
      rawResults: [
        { test: 'Hemoglobin (Hb)', val: '12.5 g/dL', ref: '13.0 - 17.0', status: 'Low' },
        { test: 'Packed Cell Volume (PCV)', val: '57.5 %', ref: '40.0 - 50.0', status: 'High' },
        { test: 'Platelet Count', val: '150,000 /cumm', ref: '150k - 410k', status: 'Borderline' },
      ],
      aiExplanation: {
        headline: 'Mildly low hemoglobin with elevated cell volume.',
        summary:
          'Your oxygen-carrying red blood cells are slightly below the normal male range, commonly pointing to mild iron deficiency or early anemia.',
        questions: [
          'Should we test ferritin and iron levels?',
          'Could this explain my recent fatigue or low energy?',
        ],
      },
    },
    lipid: {
      name: 'Comprehensive Lipid Profile',
      lab: 'Metropolis Diagnostics',
      date: 'Yesterday, 3:15 PM',
      rawResults: [
        { test: 'Total Cholesterol', val: '228 mg/dL', ref: '< 200', status: 'High' },
        { test: 'LDL ("Bad") Cholesterol', val: '148 mg/dL', ref: '< 100', status: 'High' },
        { test: 'HDL ("Good") Cholesterol', val: '52 mg/dL', ref: '> 40', status: 'Normal' },
      ],
      aiExplanation: {
        headline: 'Elevated total and LDL cholesterol markers.',
        summary:
          'While your protective HDL is normal, your LDL is elevated above reference ranges, indicating cardiovascular risk factors to review.',
        questions: [
          'What dietary modifications should I start with?',
          'Do you recommend starting statin therapy or re-testing in 90 days?',
        ],
      },
    },
  }

  const currentReport = demoReports[activeDemoTab]

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-slate-900 selection:bg-teal-100 selection:text-teal-900 font-sans">
      {/* Navigation Bar (Compact 64px height) */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF9]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/" className="group focus:outline-none">
              <Logo size={36} />
            </Link>

            {/* Interactive Nav Links with Hover & Selected Effect */}
            <div className="hidden md:flex items-center bg-stone-200/60 p-1 rounded-full border border-stone-200/80">
              {navLinks.map((link) => {
                const isSelected = activeNav === link.id
                return (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={() => setActiveNav(link.id)}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
                    }`}
                  >
                    {link.label}
                  </a>
                )
              })}
            </div>

            {/* Auth Actions & Mobile Hamburger */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link
                to="/login"
                className="hidden sm:inline-block text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-stone-200/60 px-3 py-1.5 rounded-lg transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/signup?role=patient"
                className="text-xs sm:text-sm font-semibold bg-slate-900 text-white px-3.5 sm:px-4 py-2 rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              </Link>

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FAFAF9] border-t border-stone-200 px-4 pt-3 pb-5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg">
            <div className="space-y-1">
              {navLinks.map((link) => {
                const isSelected = activeNav === link.id
                return (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={() => {
                      setActiveNav(link.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-stone-200/60'
                    }`}
                  >
                    {link.label}
                  </a>
                )
              })}
            </div>

            <div className="pt-3 border-t border-stone-200/80 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup?role=patient"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-xl shadow-xs transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION — Viewport-Fitted & Perfectly Screen Proportioned */}
      <section id="interactive-preview" className="relative min-h-[calc(100vh-4rem)] flex items-center py-6 sm:py-8 lg:py-10 overflow-hidden scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Clear Value Proposition */}
            <div className="lg:col-span-6 xl:col-span-6 text-left">
              {/* Clinical Precision Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-slate-700 text-[11px] font-semibold mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>Clinical Multimodal AI & Verified Care Link</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-4">
                Medical reports in{' '}
                <span className="text-teal-700 decoration-teal-300 decoration-2 underline underline-offset-4">
                  plain words
                </span>
                . Connected directly to your doctor.
              </h1>

              {/* Subhead */}
              <p className="text-sm sm:text-base text-slate-600 mb-6 leading-relaxed max-w-lg">
                Upload any lab report, blood test, or scan. MedLink visually translates dense numbers into simple, understandable explanations—without making autonomous diagnoses—and links directly with your physician.
              </p>

              {/* Dual CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-6">
                <Link
                  to="/signup?role=patient"
                  className="px-5 py-3 bg-slate-900 text-white rounded-xl font-semibold text-xs sm:text-sm hover:bg-slate-800 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 group"
                >
                  <span>Upload a Report (Free for Patients)</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/signup?role=doctor"
                  className="px-4 py-3 bg-white text-slate-700 border border-stone-300 rounded-xl font-semibold text-xs sm:text-sm hover:bg-stone-50 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                >
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span>Doctor Registration</span>
                </Link>
              </div>

              {/* Micro Trust Points */}
              <div className="pt-4 border-t border-stone-200 grid grid-cols-3 gap-2 sm:gap-3 text-center sm:text-left">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">100% Free</div>
                  <div className="text-[9px] sm:text-xs text-slate-500 mt-0.5 leading-tight">Patient accounts</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">Zero Diagnosis</div>
                  <div className="text-[9px] sm:text-xs text-slate-500 mt-0.5 leading-tight">Educational clarity</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">Private & Linked</div>
                  <div className="text-[9px] sm:text-xs text-slate-500 mt-0.5 leading-tight">Encrypted doctor link</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Product Artifact (Compact & Viewport-Fitted) */}
            <div className="lg:col-span-6 xl:col-span-6">
              <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden max-w-lg mx-auto lg:max-w-none">
                {/* Product Header */}
                <div className="bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-stone-700"></div>
                      <div className="w-2 h-2 rounded-full bg-stone-700"></div>
                      <div className="w-2 h-2 rounded-full bg-stone-700"></div>
                    </div>
                    <span className="text-[11px] font-semibold text-stone-300 pl-2 border-l border-stone-700">
                      Live Translation Preview
                    </span>
                  </div>

                  {/* Switch Sample Reports */}
                  <div className="flex bg-stone-800 p-0.5 rounded-lg text-[11px] font-medium">
                    <button
                      onClick={() => setActiveDemoTab('cbc')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        activeDemoTab === 'cbc'
                          ? 'bg-teal-600 text-white shadow-sm font-semibold'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Blood Count (CBC)
                    </button>
                    <button
                      onClick={() => setActiveDemoTab('lipid')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        activeDemoTab === 'lipid'
                          ? 'bg-teal-600 text-white shadow-sm font-semibold'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Lipid Panel
                    </button>
                  </div>
                </div>

                {/* Artifact Content: Visual Before & After */}
                <div className="p-4 sm:p-5 space-y-3.5">
                  {/* Document Header Metadata */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">{currentReport.name}</h4>
                        <p className="text-[10px] text-slate-500">
                          {currentReport.lab} • {currentReport.date}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Multimodal Verified
                    </span>
                  </div>

                  {/* The Lab Table (Compact) */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden bg-stone-50/50">
                    <div className="bg-stone-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 grid grid-cols-12 uppercase tracking-wider">
                      <span className="col-span-5">Biomarker / Test</span>
                      <span className="col-span-3 text-right">Result</span>
                      <span className="col-span-4 text-right">Reference</span>
                    </div>
                    <div className="divide-y divide-stone-100 text-[11px]">
                      {currentReport.rawResults.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 grid grid-cols-12 items-center hover:bg-white transition-colors"
                        >
                          <span className="col-span-5 font-medium text-slate-800 truncate">{item.test}</span>
                          <span className="col-span-3 text-right font-semibold">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                item.status === 'Low'
                                  ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200'
                                  : item.status === 'High'
                                  ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                                  : item.status === 'Borderline'
                                  ? 'bg-amber-50/80 text-amber-800 font-semibold'
                                  : 'text-slate-700'
                              }`}
                            >
                              {item.val}
                            </span>
                          </span>
                          <span className="col-span-4 text-right text-slate-400 text-[10px] font-mono">
                            {item.ref}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MedLink AI Plain-English Transformation Card */}
                  <div className="bg-teal-50/80 border border-teal-200/90 rounded-xl p-3.5 relative">
                    <div className="flex items-center gap-1.5 mb-1.5 text-teal-900 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>MedLink Plain-English Summary</span>
                    </div>

                    <p className="text-[11px] font-semibold text-slate-800 mb-1">
                      {currentReport.aiExplanation.headline}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-normal mb-2.5">
                      {currentReport.aiExplanation.summary}
                    </p>

                    {/* Questions to Ask Doctor */}
                    <div className="bg-white/90 rounded-lg p-2.5 border border-teal-100">
                      <div className="text-[10px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-teal-600" />
                        <span>Recommended Questions for Your Doctor:</span>
                      </div>
                      <ul className="space-y-0.5 text-[10px] text-slate-600">
                        {currentReport.aiExplanation.questions.map((q, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-teal-600 font-bold">•</span>
                            <span className="leading-tight">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* One-Click Doctor Sharing Mock */}
                    <div className="mt-2.5 pt-2 border-t border-teal-200/60 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-bold">
                          Dr
                        </div>
                        <span className="font-medium text-slate-700">
                          Ready to share with <strong>Dr. Strange (ID: 136dcc68)</strong>
                        </span>
                      </div>
                      <span className="font-bold text-teal-700 hover:text-teal-800 cursor-pointer inline-flex items-center gap-0.5">
                        Share <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EDITORIAL QUOTE STRIP */}
      <section className="border-y border-stone-200 bg-white py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <blockquote className="text-lg sm:text-xl font-serif text-slate-800 italic leading-snug">
            “When patients understand their results, anxiety turns into productive dialogue. AI clarifies the numbers; doctors provide the medicine.”
          </blockquote>
          <div className="mt-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
            MedLink Core Clinical Principle
          </div>
        </div>
      </section>

      {/* 3 STEPS SECTION — VISUAL-FIRST */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-[#FAFAF9] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
              The 3-Step Care Loop
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5 mb-1.5">
              From confusing sheet to clear care.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                <img
                  src="/step-capture.jpg"
                  alt="Scanning medical report with smartphone"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                  01 / CAPTURE
                </div>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-stone-200">
                  PDF • Photo • Scan
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">Upload Any Lab Report</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Snap a phone photo or upload your diagnostic PDF. Multimodal vision processes the data in seconds.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                <img
                  src="/step-clarify.jpg"
                  alt="Reviewing plain-English medical summary on tablet"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-teal-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                  02 / CLARIFY
                </div>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-teal-800 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-teal-200">
                  Plain-English • Non-Diagnostic
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">Instant Jargon Translation</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Abnormal markers are clearly explained with guided questions prepared for your doctor consultation.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                <img
                  src="/step-connect.jpg"
                  alt="Doctor reviewing digital records with patient"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                  03 / CONNECT
                </div>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-stone-200">
                  Doctor ID Link • Prescriptions
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">Direct Doctor Loop</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Link with your doctor using their unique 8-digit ID for 1-on-1 chat and verified digital prescriptions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DUAL PERSONA SECTION: PATIENT VS CLINICIAN */}
      <section id="for-clinicians" className="py-16 sm:py-20 bg-white border-t border-stone-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Authentic Editorial Consultation Image */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-stone-200 bg-stone-100">
                <img
                  src="/doctor-consultation.jpg"
                  alt="Doctor and patient reviewing clinical reports on tablet in a modern clinic"
                  className="w-full h-[240px] sm:h-[380px] object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-teal-300 mb-0.5">
                    Direct Physician Collaboration
                  </div>
                  <p className="text-xs font-medium text-white/90">
                    Doctors review pre-digested summaries before consultations, saving up to 15 minutes per patient intake.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Switchable Perspectives */}
            <div className="lg:col-span-6 text-left">
              {/* Persona Switcher Tabs */}
              <div className="inline-flex bg-stone-100 p-1 rounded-xl mb-6 border border-stone-200">
                <button
                  onClick={() => setActivePersona('patient')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activePersona === 'patient'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  For Patients
                </button>
                <button
                  onClick={() => setActivePersona('doctor')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activePersona === 'doctor'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  For Doctors & Clinics
                </button>
              </div>

              {activePersona === 'patient' ? (
                <div className="space-y-4">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Never walk into a doctor’s visit confused again.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    MedLink organizes your lifelong lab history in one secure vault. When new results arrive, you immediately understand the highlights without turning to stressful search engine rabbit holes.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Anxiety-Free Explanations</h5>
                        <p className="text-[11px] text-slate-500">Every abnormal result is placed in plain-English context.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Direct Chat & Prescriptions</h5>
                        <p className="text-[11px] text-slate-500">Message your linked doctor and access digital prescriptions in one place.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Full Access Control</h5>
                        <p className="text-[11px] text-slate-500">You decide which doctor can see your records and can revoke access anytime.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <Link
                      to="/signup?role=patient"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm"
                    >
                      <span>Create Free Patient Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Cut intake friction. Give patients clearer follow-through.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Stop deciphering poorly photographed lab sheets. MedLink gives physicians an organized patient timeline, pre-highlighted abnormal biomarkers, and a single secure channel for prescriptions and follow-ups.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Rapid Patient Triage</h5>
                        <p className="text-[11px] text-slate-500">See all abnormal findings across past visits instantly at a glance.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Digital Prescription Delivery</h5>
                        <p className="text-[11px] text-slate-500">Issue structured medication plans and attach supporting instructions.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Unique Public Doctor ID</h5>
                        <p className="text-[11px] text-slate-500">Share your 8-digit connection code with patients without sharing personal phone numbers.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <Link
                      to="/signup?role=doctor"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-teal-700 text-white rounded-xl text-xs font-semibold hover:bg-teal-800 transition-all shadow-sm"
                    >
                      <span>Register as a Physician</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY & MEDICAL ETHICS — VISUAL ASSURANCE */}
      <section id="safety-guardrails" className="py-16 sm:py-20 bg-[#FAFAF9] border-t border-stone-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto text-center mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-stone-200/80 border border-stone-300 px-3 py-1 rounded-full">
              Clinical Guardrails
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5 mb-1.5">
              Built for trust, not tech hype.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Guarantee 1 */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <ShieldAlert className="w-5 h-5 text-teal-600" />
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  Strict Rule
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Zero Autonomous Diagnosis</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                AI translates lab parameters. Only licensed physicians provide diagnosis and treatment.
              </p>
            </div>

            {/* Guarantee 2 */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <KeyRound className="w-5 h-5 text-slate-800" />
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-slate-700 border border-stone-200">
                  Patient Owned
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">1-Click Access Revocation</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                You control access. Unlink from any doctor instantly with one click. We never sell data.
              </p>
            </div>

            {/* Guarantee 3 */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <FileSearch className="w-5 h-5 text-teal-600" />
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  Vision AI
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Multimodal Table Precision</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Reads visual lab tables directly to eliminate OCR hallucination and column scrambling.
              </p>
            </div>

            {/* Guarantee 4 */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <UserCheck className="w-5 h-5 text-slate-800" />
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-slate-700 border border-stone-200">
                  Human Loop
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Doctor-Verified Care</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Every summary guides the patient back to their doctor with suggested consultation questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-16 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2.5">
            Take control of your health data today.
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-6 leading-relaxed">
            Bridge the gap between complicated laboratory results and compassionate, physician-guided care.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/signup?role=patient"
              className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm hover:bg-teal-400 transition-all shadow-md active:scale-[0.98]"
            >
              Sign Up as Patient (Free)
            </Link>
            <Link
              to="/signup?role=doctor"
              className="px-5 py-2.5 bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-slate-700 hover:text-white transition-all active:scale-[0.98]"
            >
              Join as a Physician
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-8 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-5 border-b border-stone-200">
            <Logo size={28} />
            <div className="flex gap-5 text-slate-600 font-medium text-xs">
              <Link to="/login" className="hover:text-slate-900 transition-colors">
                Sign In
              </Link>
              <Link to="/signup?role=patient" className="hover:text-slate-900 transition-colors">
                Patient Portal
              </Link>
              <Link to="/signup?role=doctor" className="hover:text-slate-900 transition-colors">
                Doctor Portal
              </Link>
            </div>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-slate-400 text-[11px]">
            <p>© {new Date().getFullYear()} MedLink. All rights reserved.</p>
            <p className="text-center sm:text-right max-w-md">
              Disclaimer: MedLink is designed for educational and organizational purposes only and does not provide medical diagnoses or treatment plans. Always seek the advice of your physician.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
