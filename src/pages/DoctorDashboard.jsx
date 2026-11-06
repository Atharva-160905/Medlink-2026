import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  FileText,
  Plus,
  UserPlus,
  LogOut,
  Search,
  User,
  ArrowLeft,
  Upload,
  Trash2,
  MessageCircle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Download,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Calendar,
  X,
  Stethoscope,
  Briefcase
} from 'lucide-react'
import MedicalChatbot from '../components/MedicalChatbot'
import ChatModal from '../components/ChatModal'
import Logo from '../components/Logo'
import MedicalReportSummary from '../components/MedicalReportSummary'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [patients, setPatients] = useState([])

  // UI State
  const [patientIdInput, setPatientIdInput] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'pending'
  const [copiedId, setCopiedId] = useState(false)
  const [copiedPatientId, setCopiedPatientId] = useState(false)

  // Selected Patient Data
  const [patientDocs, setPatientDocs] = useState([])
  const [patientRx, setPatientRx] = useState([])
  const [newRx, setNewRx] = useState('')
  const [uploadFiles, setUploadFiles] = useState([])
  const [submittingRx, setSubmittingRx] = useState(false)
  const [expandedRx, setExpandedRx] = useState(null)
  const [messages, setMessages] = useState({})
  const [rxDocs, setRxDocs] = useState({})

  // Document Inspection Modal for Doctor
  const [activeDocModal, setActiveDocModal] = useState(null)
  const [docModalTab, setDocModalTab] = useState('original') // 'original' | 'summary'

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profile)
    loadPatients(user.id)
  }

  const loadPatients = async (doctorId) => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('doctor_patient_links')
        .select('*, patient:profiles!patient_id(*)')
        .eq('doctor_id', doctorId)

      setPatients(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadPatientDetails = async (patientId) => {
    // Load docs and rx
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('patient_id', patientId)
      .order('uploaded_at', { ascending: false })

    const { data: rx } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', profile.id)
      .order('created_at', { ascending: false })

    setPatientDocs(docs || [])
    setPatientRx(rx || [])

    // Load prescription documents for each Rx
    if (rx && rx.length > 0) {
      for (const prescription of rx) {
        const { data: rxDocuments } = await supabase
          .from('prescription_documents')
          .select('*')
          .eq('prescription_id', prescription.id)
        setRxDocs((prev) => ({ ...prev, [prescription.id]: rxDocuments || [] }))
      }
    }
  }

  const addPatient = async () => {
    if (!patientIdInput.trim()) return
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        alert('Session expired. Please log in again.')
        navigate('/login')
        return
      }

      const { data: pat, error: patError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'patient')
        .eq('public_id', patientIdInput.trim())
        .single()

      if (patError || !pat) {
        alert('Patient not found with ID: ' + patientIdInput.trim())
        return
      }

      if (pat.id === user.id) {
        alert('You cannot link yourself as your own patient.')
        return
      }

      const { error } = await supabase.from('doctor_patient_links').insert({
        doctor_id: user.id,
        patient_id: pat.id,
        status: 'pending', // Must be accepted by patient
        created_by: 'doctor',
      })

      if (error) {
        if (error.code === '23505') alert('Request already sent or linked with this patient!')
        else throw error
      } else {
        alert(`Link request sent to patient ${pat.full_name || ''}. They will review it in their dashboard.`)
        setPatientIdInput('')
        loadPatients(user.id)
      }
    } catch (e) {
      console.error('Error adding patient:', e)
      alert(e.message)
    }
  }

  const handleAddRx = async (e) => {
    e.preventDefault()
    if (!newRx.trim() && uploadFiles.length === 0) return

    setSubmittingRx(true)
    const medText = newRx.trim() || 'See attached care document(s)'

    try {
      // Create prescription
      const { data: rxData, error: rxError } = await supabase
        .from('prescriptions')
        .insert({
          doctor_id: profile.id,
          patient_id: selectedPatient.patient.id,
          medication_text: medText,
        })
        .select()
        .single()

      if (rxError) throw rxError

      // Upload files if any
      for (const file of uploadFiles) {
        const fileExt = file.name.split('.').pop()
        const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
        const filePath = `rx_docs/${rxData.id}/${cleanFileName}`

        const { error: uploadError } = await supabase.storage
          .from('patient_documents')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        await supabase.from('prescription_documents').insert({
          prescription_id: rxData.id,
          doctor_id: profile.id,
          filename: file.name,
          storage_path: filePath,
          file_type: fileExt,
        })
      }

      setNewRx('')
      setUploadFiles([])
      loadPatientDetails(selectedPatient.patient.id)
    } catch (e) {
      alert('Error issuing prescription: ' + e.message)
    } finally {
      setSubmittingRx(false)
    }
  }

  const deletePrescription = async (rxId) => {
    if (!confirm('Are you sure you want to delete this prescription history?')) return
    try {
      const { error } = await supabase.from('prescriptions').delete().eq('id', rxId)
      if (error) throw error
      setPatientRx((prev) => prev.filter((rx) => rx.id !== rxId))
      if (expandedRx === rxId) setExpandedRx(null)
    } catch (error) {
      alert('Failed to delete prescription: ' + error.message)
    }
  }

  const loadMessages = async (rxId) => {
    if (!selectedPatient) return
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*, sender:profiles!sender_id(full_name, role)')
        .eq('link_id', selectedPatient.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages((prev) => ({ ...prev, [rxId]: data || [] }))
    } catch (err) {
      console.error('Chat Load Error:', err)
    }
  }

  const sendMessage = async (rxId, text) => {
    if (!text?.trim() || !selectedPatient) return
    try {
      await supabase.from('direct_messages').insert({
        link_id: selectedPatient.id,
        sender_id: profile.id,
        message_text: text,
      })
      loadMessages(rxId)
    } catch (e) {
      alert(e.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const handleCopyDoctorId = () => {
    if (!profile?.public_id) return
    navigator.clipboard.writeText(profile.public_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleCopyPatientId = (patientId) => {
    if (!patientId) return
    navigator.clipboard.writeText(patientId)
    setCopiedPatientId(true)
    setTimeout(() => setCopiedPatientId(false), 2000)
  }

  // Filtered patients
  const activePatients = patients.filter((p) => p.status === 'active')
  const pendingPatients = patients.filter((p) => p.status === 'pending')

  const filteredPatients = patients.filter((link) => {
    const matchesSearch =
      (link.patient?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.patient?.public_id || '').toLowerCase().includes(searchQuery.toLowerCase())

    if (statusFilter === 'active') return matchesSearch && link.status === 'active'
    if (statusFilter === 'pending') return matchesSearch && link.status === 'pending'
    return matchesSearch
  })

  const getCategoryBadgeClass = (type) => {
    switch (type) {
      case 'Lab Result':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      case 'Prescription':
        return 'bg-sky-50 text-sky-800 border-sky-200'
      case 'Diagnosis':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200'
      case 'Vaccination':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  if (loading && !selectedPatient) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Accessing clinical portal...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased flex flex-col font-sans">
      {/* Top Clinical Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <Logo size={32} showWordmark={true} />
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Clinician Portal
            </span>
          </div>

          {/* Doctor Controls */}
          <div className="flex items-center gap-3">
            {/* Doctor Identity Pill */}
            <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-1 sm:px-2.5 sm:py-1.5 gap-2">
              <div
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 cursor-pointer group"
                title="View & Edit Clinical Profile"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold group-hover:bg-teal-700 transition-colors flex-shrink-0">
                    {profile?.full_name ? profile.full_name[0].toUpperCase() : 'D'}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                    Dr. {profile?.full_name || 'Physician'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono leading-tight">
                    ID: {profile?.public_id || '------'}
                  </p>
                </div>
              </div>

              {/* 1-Click Copy Public Doctor ID */}
              <button
                onClick={handleCopyDoctorId}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors relative cursor-pointer"
                title="Copy Doctor ID for Patients"
              >
                {copiedId ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedId && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                    Copied ID!
                  </span>
                )}
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {selectedPatient ? (
          /* ========================================================
             PATIENT CLINICAL CHART VIEW
             ======================================================== */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Breadcrumb Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedPatient(null)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Patient Roster</span>
              </button>

              <span className="text-xs text-slate-400 font-mono">
                Linked Patient Chart
              </span>
            </div>

            {/* Patient Hero Banner */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold flex-shrink-0 overflow-hidden border border-slate-200">
                  {selectedPatient.patient?.avatar_url ? (
                    <img
                      src={selectedPatient.patient.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{selectedPatient.patient?.full_name ? selectedPatient.patient.full_name[0].toUpperCase() : 'P'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                      {selectedPatient.patient?.full_name}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Active Link
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      ID: {selectedPatient.patient?.public_id}
                    </span>
                    <button
                      onClick={() => handleCopyPatientId(selectedPatient.patient?.public_id)}
                      className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
                      title="Copy Patient ID"
                    >
                      {copiedPatientId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => navigate(`/profile/${selectedPatient.patient.id}`)}
                  className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>View Full Profile</span>
                </button>

                <button
                  onClick={() => {
                    setExpandedRx('GLOBAL')
                    loadMessages('GLOBAL')
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Open Care Chat</span>
                </button>
              </div>
            </section>

            {/* Two-Column Clinical Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Patient Diagnostic Documents */}
              <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-700" />
                    <h2 className="text-base font-bold text-slate-900">
                      Patient Diagnostic Reports
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {patientDocs.length} files
                  </span>
                </div>

                {patientDocs.length > 0 ? (
                  <div className="space-y-3">
                    {patientDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                                  doc.type
                                )}`}
                              >
                                {doc.type || 'Other'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {doc.uploaded_at
                                  ? new Date(doc.uploaded_at).toLocaleDateString()
                                  : 'Uploaded'}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 truncate max-w-sm">
                              {doc.title || doc.filename}
                            </h3>
                            {doc.description && (
                              <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                                {doc.description}
                              </p>
                            )}
                          </div>

                          {doc.summary && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                              <CheckCircle2 className="h-3 w-3" /> AI Translated
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
                            {doc.filename}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveDocModal(doc)
                                setDocModalTab(doc.summary ? 'summary' : 'original')
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Inspect</span>
                            </button>

                            <button
                              onClick={async () => {
                                const { data } = await supabase.storage
                                  .from('patient_documents')
                                  .createSignedUrl(doc.storage_path, 60)
                                if (data) window.open(data.signedUrl, '_blank')
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                              title="Download Report"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-0.5">
                      No documents shared
                    </p>
                    <p className="text-xs text-slate-400">
                      When the patient uploads lab results or scans, they will appear here.
                    </p>
                  </div>
                )}
              </section>

              {/* Right Column: Prescriptions & Care Plans */}
              <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-slate-700" />
                    <h2 className="text-base font-bold text-slate-900">
                      Prescription & Care Plan History
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {patientRx.length} entries
                  </span>
                </div>

                {/* History List */}
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {patientRx.map((rx) => (
                    <div
                      key={rx.id}
                      onClick={() => {
                        setExpandedRx(rx.id)
                        loadMessages(rx.id)
                      }}
                      className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center">
                            Rx
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(rx.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deletePrescription(rx.id)
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Prescription"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed mb-2 whitespace-pre-wrap">
                        {rx.medication_text}
                      </p>

                      {/* Attachments pills */}
                      {rxDocs[rx.id] && rxDocs[rx.id].length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60">
                          {rxDocs[rx.id].map((doc) => (
                            <span
                              key={doc.id}
                              className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 truncate max-w-[150px]"
                            >
                              📎 {doc.filename}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {patientRx.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-xs sm:text-sm text-slate-500">
                        No prescriptions issued for this patient yet.
                      </p>
                    </div>
                  )}
                </div>

                {/* Issue New Prescription Form */}
                <form
                  onSubmit={handleAddRx}
                  className="pt-4 border-t border-slate-100 space-y-3"
                >
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Issue New Prescription or Care Instruction
                  </label>
                  <textarea
                    placeholder="Enter medications, dosage instructions, or clinical recommendations..."
                    rows={3}
                    value={newRx}
                    onChange={(e) => setNewRx(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-xs sm:text-sm transition-colors resize-none font-medium"
                  />

                  {/* Attachment zone */}
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-3 text-center transition-colors bg-slate-50/50 cursor-pointer">
                    <input
                      type="file"
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                    />
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                      <Upload className="h-3.5 w-3.5 text-slate-400" />
                      {uploadFiles.length > 0 ? (
                        <span className="font-semibold text-slate-900">
                          {uploadFiles.length} document(s) attached
                        </span>
                      ) : (
                        <span>Attach supporting documents or scans (optional)</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingRx || (!newRx.trim() && uploadFiles.length === 0)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingRx ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>{submittingRx ? 'Issuing Prescription...' : 'Issue Prescription'}</span>
                  </button>
                </form>
              </section>
            </div>
          </div>
        ) : (
          /* ========================================================
             PATIENT ROSTER VIEW
             ======================================================== */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Practice Command Center Banner */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                      Welcome back, Dr. {profile?.full_name?.split(' ')[0] || 'Doctor'}
                    </h1>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="h-3 w-3" />
                      Active Clinical Session
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                    Review incoming diagnostic reports, manage your patient roster, and issue digital
                    prescriptions through encrypted care channels.
                  </p>
                </div>

                {/* Practice Metrics */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto flex-shrink-0">
                  <div
                    onClick={() => setStatusFilter('active')}
                    className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                      statusFilter === 'active'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200/80 text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="text-lg sm:text-2xl font-bold tracking-tight mb-0.5">
                      {activePatients.length}
                    </div>
                    <div
                      className={`text-[10px] sm:text-[11px] font-medium leading-tight ${
                        statusFilter === 'active' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      Active Patients
                    </div>
                  </div>

                  <div
                    onClick={() => setStatusFilter('pending')}
                    className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                      statusFilter === 'pending'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200/80 text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="text-lg sm:text-2xl font-bold tracking-tight mb-0.5">
                      {pendingPatients.length}
                    </div>
                    <div
                      className={`text-[10px] sm:text-[11px] font-medium leading-tight ${
                        statusFilter === 'pending' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      Pending Requests
                    </div>
                  </div>

                  <div
                    onClick={() => setStatusFilter('all')}
                    className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                      statusFilter === 'all'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200/80 text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="text-lg sm:text-2xl font-bold tracking-tight mb-0.5">
                      {patients.length}
                    </div>
                    <div
                      className={`text-[10px] sm:text-[11px] font-medium leading-tight ${
                        statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      Total Links
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Connect Patient Card */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="max-w-xl">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Connect with a Patient
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                  Enter the patient's 8-character MedLink ID to request access to their diagnostic records.
                  The patient will approve the request in their dashboard.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Enter 8-digit Patient ID (e.g. 89277F09)"
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 font-mono uppercase transition-colors"
                  />
                  <button
                    onClick={addPatient}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Send Request</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Patient Roster Workspace */}
            <section className="space-y-4">
              {/* Filter and Search Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patients by name or public ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-900 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs */}
                <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                  {[
                    { id: 'all', label: `All (${patients.length})` },
                    { id: 'active', label: `Active (${activePatients.length})` },
                    { id: 'pending', label: `Pending (${pendingPatients.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Cards Grid */}
              {filteredPatients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPatients.map((link) => {
                    const isActive = link.status === 'active'

                    return (
                      <div
                        key={link.id}
                        onClick={() => {
                          if (isActive) {
                            setSelectedPatient(link)
                            loadPatientDetails(link.patient_id)
                          }
                        }}
                        className={`bg-white border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between group ${
                          isActive
                            ? 'border-slate-200/90 hover:border-slate-300 hover:shadow cursor-pointer'
                            : 'border-dashed border-slate-300 bg-slate-50/50 opacity-80'
                        }`}
                      >
                        <div>
                          {/* Top Identity Row */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden border border-slate-200 ${
                                  isActive
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {link.patient?.avatar_url ? (
                                  <img
                                    src={link.patient.avatar_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{link.patient?.full_name ? link.patient.full_name[0].toUpperCase() : 'P'}</span>
                                )}
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                                  {link.patient?.full_name}
                                </h3>
                                <p className="text-xs font-mono text-slate-500">
                                  ID: {link.patient?.public_id}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isActive ? 'Active' : 'Pending'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mb-4">
                            {isActive
                              ? 'Connected care link. Click to review diagnostic charts.'
                              : 'Request sent. Awaiting confirmation from patient.'}
                          </p>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          {isActive ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/profile/${link.patient_id}`)
                                }}
                                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Profile</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedPatient(link)
                                  loadPatientDetails(link.patient_id)
                                }}
                                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Open Chart</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-medium">
                              Awaiting approval
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <User className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {searchQuery ? 'No matching patients found' : 'No patients linked yet'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
                    {searchQuery
                      ? 'Try searching with a different name or patient ID.'
                      : "Enter a patient's 8-character ID above to invite them to your care roster."}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* DOCUMENT INSPECTION MODAL FOR CLINICIAN */}
      {activeDocModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                      activeDocModal.type
                    )}`}
                  >
                    {activeDocModal.type || 'Other'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {activeDocModal.uploaded_at
                      ? new Date(activeDocModal.uploaded_at).toLocaleDateString()
                      : 'Unknown Date'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">
                  {activeDocModal.title || activeDocModal.filename}
                </h3>
              </div>

              <button
                onClick={() => setActiveDocModal(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Segmented Switcher */}
            <div className="px-5 pt-3 border-b border-slate-100 bg-white">
              <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1 mb-2">
                <button
                  onClick={() => setDocModalTab('original')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    docModalTab === 'original'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-slate-700" />
                  <span>Original Document</span>
                </button>

                <button
                  onClick={() => setDocModalTab('summary')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    docModalTab === 'summary'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-slate-700" />
                  <span>Patient AI Translation</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div data-lenis-prevent className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white space-y-4">
              {docModalTab === 'original' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 truncate" title={activeDocModal.filename}>
                          {activeDocModal.filename}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          Format: {activeDocModal.file_type || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('patient_documents')
                            .createSignedUrl(activeDocModal.storage_path, 60)
                          if (data) window.open(data.signedUrl, '_blank')
                        }}
                        className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open in New Tab</span>
                      </button>

                      <button
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('patient_documents')
                            .createSignedUrl(activeDocModal.storage_path, 60)
                          if (data) {
                            const link = document.createElement('a')
                            link.href = data.signedUrl
                            link.download = activeDocModal.filename
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          }
                        }}
                        className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {activeDocModal.description && (
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Patient Context
                      </p>
                      <p className="text-xs sm:text-sm text-slate-700">{activeDocModal.description}</p>
                    </div>
                  )}
                </div>
              )}

              {docModalTab === 'summary' && (
                <div className="space-y-4">
                  {activeDocModal.summary ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>
                          This plain-English translation was provided to the patient via Gemini Multimodal
                          reading. Clinicians can review this to see what questions the patient may bring to
                          their consultation.
                        </span>
                      </div>

                      <MedicalReportSummary summary={activeDocModal.summary} />
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl p-6">
                      <p className="text-xs sm:text-sm text-slate-500">
                        No AI translation has been generated for this document yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveDocModal(null)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL (DIRECT & PRESCRIPTION) */}
      {expandedRx && (
        <ChatModal
          isOpen={true}
          onClose={() => setExpandedRx(null)}
          prescription={
            expandedRx === 'GLOBAL'
              ? null
              : {
                  ...(patientRx.find((p) => p.id === expandedRx) || {}),
                  documents: rxDocs[expandedRx] || [],
                }
          }
          patientName={selectedPatient?.patient?.full_name}
          messages={messages[expandedRx] || []}
          currentUserId={profile?.id}
          role="doctor"
          onSendMessage={(text) => sendMessage(expandedRx, text)}
          onDownloadAttachment={async (doc) => {
            const { data } = await supabase.storage
              .from('patient_documents')
              .createSignedUrl(doc.storage_path, 60)
            if (data) window.open(data.signedUrl, '_blank')
          }}
        />
      )}

      {/* FLOATING MEDICAL AI ASSISTANT */}
      <MedicalChatbot />
    </div>
  )
}
