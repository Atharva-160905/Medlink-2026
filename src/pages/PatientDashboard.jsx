import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  FileText,
  Upload,
  Plus,
  LogOut,
  Search,
  Trash2,
  X,
  MessageCircle,
  Sparkles,
  Loader2,
  Check,
  User,
  Users,
  Eye,
  Clock,
  Copy,
  CheckCircle2,
  Calendar,
  Download,
  Stethoscope,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'

import { extractTextFromUrl } from '../lib/textUtils'
import { generateMedicalSummary } from '../lib/ai'
import MedicalChatbot from '../components/MedicalChatbot'
import ChatModal from '../components/ChatModal'
import Logo from '../components/Logo'
import MedicalReportSummary from '../components/MedicalReportSummary'

export default function PatientDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  // Data
  const [documents, setDocuments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [doctors, setDoctors] = useState([]) // Linked doctors
  const [requests, setRequests] = useState([]) // Pending requests from doctors
  const [debugError, setDebugError] = useState(null)

  // UI State
  const [doctorIdInput, setDoctorIdInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('documents') // 'documents' | 'chats' | 'doctors'
  const [expandedRx, setExpandedRx] = useState(null) // ID of expanded prescription
  const [rxDocs, setRxDocs] = useState({}) // { rxId: [docs] }
  const [chatError, setChatError] = useState(null)
  const [messages, setMessages] = useState({}) // { rxId: [messages] }

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [copiedId, setCopiedId] = useState(false)

  // AI Summary State
  const [summarizing, setSummarizing] = useState({}) // { docId: boolean }
  const [summaries, setSummaries] = useState({}) // { docId: string }
  const [activeSummaryDoc, setActiveSummaryDoc] = useState(null) // Doc to show in modal
  const [viewDocTab, setViewDocTab] = useState('summary') // 'summary' | 'original'

  // Record Modal State
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [recordForm, setRecordForm] = useState({
    title: '',
    type: 'Lab Result',
    description: '',
    file: null
  })

  useEffect(() => {
    if (expandedRx) setChatError(null)
  }, [expandedRx])

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

    // Load Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profile)
    loadData(user.id, true)
  }

  const loadData = async (userId, isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true)
    try {
      // 1. Documents
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', userId)
        .order('uploaded_at', { ascending: false })
      setDocuments(docs || [])

      // 2. Prescriptions
      const { data: rx } = await supabase
        .from('prescriptions')
        .select('*, doctor:profiles!doctor_id(full_name, public_id, avatar_url)')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
      setPrescriptions(rx || [])

      // 3. Links (Active & Pending)
      const { data: links } = await supabase
        .from('doctor_patient_links')
        .select('*, doctor:profiles!doctor_id(full_name, public_id, avatar_url)')
        .eq('patient_id', userId)

      const active = links?.filter((l) => l.status === 'active') || []
      const pending = links?.filter((l) => l.status === 'pending') || []

      setDoctors(active)
      setRequests(pending)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      if (isInitialLoad) setLoading(false)
    }
  }

  const loadRxDetails = async (rxId) => {
    // Load documents for this prescription
    const { data: docs } = await supabase
      .from('prescription_documents')
      .select('*')
      .eq('prescription_id', rxId)
    setRxDocs((prev) => ({ ...prev, [rxId]: docs || [] }))

    // Find the link_id for this doctor
    const rx = prescriptions.find((p) => p.id === rxId)
    if (!rx) return

    const link = doctors.find((d) => d.doctor_id === rx.doctor_id)
    if (!link) return

    try {
      const { data: msgs, error } = await supabase
        .from('direct_messages')
        .select('*, sender:profiles!sender_id(full_name, role)')
        .eq('link_id', link.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages((prev) => ({ ...prev, [rxId]: msgs || [] }))
    } catch (err) {
      console.error('Chat Load Error:', err)
      setChatError('Chat Error: ' + (err.message || 'Unknown error'))
    }
  }

  const sendMessage = async (rxId, text) => {
    if (!text?.trim()) return

    if (rxId.startsWith('LINK_')) {
      const linkId = rxId.replace('LINK_', '')
      return sendGlobalMessage(linkId, text)
    }

    const rx = prescriptions.find((p) => p.id === rxId)
    if (!rx) return

    const link = doctors.find((d) => d.doctor_id === rx.doctor_id)
    if (!link) {
      alert('No active link with this doctor')
      return
    }

    try {
      await supabase.from('direct_messages').insert({
        link_id: link.id,
        sender_id: profile.id,
        message_text: text,
      })
      loadRxDetails(rxId)
    } catch (error) {
      console.error(error)
      setChatError('Send Error: ' + error.message)
      alert('Failed to send message: ' + error.message)
    }
  }

  const loadGlobalChat = async (linkId) => {
    try {
      const { data: msgs, error } = await supabase
        .from('direct_messages')
        .select('*, sender:profiles!sender_id(full_name, role)')
        .eq('link_id', linkId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages((prev) => ({ ...prev, [`LINK_${linkId}`]: msgs || [] }))
    } catch (err) {
      console.error(err)
      setChatError('Chat Error: ' + err.message)
    }
  }

  const sendGlobalMessage = async (linkId, text) => {
    try {
      await supabase.from('direct_messages').insert({
        link_id: linkId,
        sender_id: profile.id,
        message_text: text,
      })
      loadGlobalChat(linkId)
    } catch (error) {
      console.error(error)
      setChatError('Send Error: ' + error.message)
      alert('Failed to send message')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const handleCopyId = () => {
    if (!profile?.public_id) return
    navigator.clipboard.writeText(profile.public_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleViewDocument = (doc, initialTab = 'original') => {
    setActiveSummaryDoc(doc)
    setViewDocTab(initialTab)
  }

  const handleDeletePrescription = async (rxId) => {
    if (!confirm('Delete this prescription thread?')) return
    try {
      const { error } = await supabase.from('prescriptions').delete().eq('id', rxId)
      if (error) throw error
      setPrescriptions((prev) => prev.filter((p) => p.id !== rxId))
      if (expandedRx === rxId) setExpandedRx(null)
    } catch (error) {
      alert('Failed to delete: ' + error.message)
    }
  }

  const handleAddRecord = async () => {
    if (!recordForm.file || !recordForm.title) {
      alert('Please provide a title and select a file.')
      return
    }

    setUploading(true)
    try {
      const file = recordForm.file
      const fileExt = file.name.split('.').pop()
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `${profile.id}/${cleanFileName}`

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('patient_documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Record in DB
      const { error: dbError } = await supabase.from('documents').insert({
        patient_id: profile.id,
        filename: file.name,
        storage_path: filePath,
        file_type: fileExt,
        title: recordForm.title.trim(),
        type: recordForm.type,
        description: recordForm.description?.trim() || null,
      })

      if (dbError) throw dbError

      // Refresh & Reset
      await loadData(profile.id)
      setRecordForm({ title: '', type: 'Lab Result', description: '', file: null })
      setShowRecordModal(false)
    } catch (error) {
      console.error('Upload flow error:', error)
      alert('Upload failed: ' + error.message)
      setDebugError(error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSummarize(doc, forceRegenerate = false) {
    const existingSummary = doc.summary || summaries[doc.id]
    if (existingSummary && !forceRegenerate) {
      setActiveSummaryDoc({ ...doc, summary: existingSummary })
      setViewDocTab('summary')
      return
    }

    try {
      setSummarizing((prev) => ({ ...prev, [doc.id]: true }))

      // 1. Get Signed URL
      const { data, error } = await supabase.storage
        .from('patient_documents')
        .createSignedUrl(doc.storage_path, 300)
      if (error) throw error

      // 2. Generate Summary using Gemini Multimodal Vision
      let summary = ''
      try {
        summary = await generateMedicalSummary(data.signedUrl, doc.filename || doc.storage_path)
      } catch (multimodalErr) {
        console.error('Multimodal summary error:', multimodalErr)
        const isPdf = (doc.filename || doc.storage_path || '').toLowerCase().includes('.pdf')
        if (
          isPdf ||
          multimodalErr.message?.includes('API Key') ||
          multimodalErr.message?.includes('Quota') ||
          multimodalErr.message?.includes('Gemini Error')
        ) {
          throw multimodalErr
        }
        // Fallback for non-PDF image OCR
        const text = await extractTextFromUrl(data.signedUrl)
        summary = await generateMedicalSummary(text)
      }

      // Save to DB
      const { error: updateError } = await supabase
        .from('documents')
        .update({ summary: summary })
        .eq('id', doc.id)

      if (updateError) throw updateError

      // Update State
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, summary } : d)))
      setSummaries((prev) => ({ ...prev, [doc.id]: summary }))

      // Open Modal with new summary
      setActiveSummaryDoc({ ...doc, summary })
      setViewDocTab('summary')
    } catch (err) {
      console.error(err)
      alert('Failed to generate summary: ' + err.message)
    } finally {
      setSummarizing((prev) => ({ ...prev, [doc.id]: false }))
    }
  }

  const addDoctor = async () => {
    if (!doctorIdInput.trim()) return

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        alert('Session expired or not logged in. Please log in again.')
        navigate('/login')
        return
      }

      // Find doctor by public ID
      const { data: doc, error: docError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'doctor')
        .eq('public_id', doctorIdInput.trim())
        .single()

      if (docError || !doc) {
        alert('Doctor not found with ID: ' + doctorIdInput.trim())
        return
      }

      if (doc.id === user.id) {
        alert('You cannot link yourself as your own doctor.')
        return
      }

      // Create Active Link (Patient initiated)
      const { error: linkError } = await supabase.from('doctor_patient_links').insert({
        doctor_id: doc.id,
        patient_id: user.id,
        status: 'active',
        created_by: 'patient',
      })

      if (linkError) {
        if (linkError.code === '23505') alert('Already linked with this doctor!')
        else throw linkError
      } else {
        alert(`Doctor ${doc.full_name || ''} connected successfully!`)
        setDoctorIdInput('')
        loadData(user.id)
      }
    } catch (error) {
      console.error('Error adding doctor:', error)
      alert('Error adding doctor: ' + error.message)
    }
  }

  const handleUpdateLink = async (linkId, status) => {
    if (status === 'rejected') {
      if (!confirm('Decline this doctor connection request?')) return
      const { error } = await supabase.from('doctor_patient_links').delete().eq('id', linkId)
      if (error) alert('Error declining: ' + error.message)
      else loadData(profile.id)
    } else {
      const { error } = await supabase
        .from('doctor_patient_links')
        .update({ status: 'active' })
        .eq('id', linkId)

      if (error) alert('Error updating: ' + error.message)
      else {
        alert('Doctor connected successfully!')
        loadData(profile.id)
      }
    }
  }

  const handleRemoveDoctor = async (linkId) => {
    if (!confirm('Remove this doctor? They will lose access to view your medical records.')) return
    try {
      const { error } = await supabase.from('doctor_patient_links').delete().eq('id', linkId)

      if (error) throw error
      loadData(profile.id)
    } catch (error) {
      alert('Failed to remove doctor: ' + error.message)
    }
  }

  // Filtered documents calculation
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.filename || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'All' || (doc.type || 'Other').toLowerCase() === selectedCategory.toLowerCase()

    return matchesSearch && matchesCategory
  })

  const categories = ['All', 'Lab Result', 'Prescription', 'Diagnosis', 'Vaccination', 'Other']

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Accessing encrypted medical vault...</p>
      </div>
    )
  }

  if (debugError) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-red-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Records</h2>
          <p className="text-sm text-slate-600 mb-4">{debugError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Reload Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased flex flex-col">
      {/* Top Clinical Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <Logo size={32} showWordmark={true} />
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Patient Vault
            </span>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {/* Patient Identity Pill */}
            <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-1 sm:px-2.5 sm:py-1.5 gap-2">
              <div
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 cursor-pointer group"
                title="View & Edit Profile"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold group-hover:bg-teal-700 transition-colors flex-shrink-0">
                    {profile?.full_name ? profile.full_name[0].toUpperCase() : 'P'}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                    {profile?.full_name || 'Patient'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono leading-tight">
                    ID: {profile?.public_id || '------'}
                  </p>
                </div>
              </div>

              {/* 1-Click Copy Public ID */}
              <button
                onClick={handleCopyId}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors relative"
                title="Copy Patient ID for Doctor"
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
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome & Clinical Status Banner */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'Patient'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" />
                  Protected Vault
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Your diagnostic reports are encrypted and ready for instant plain-English translation.
                Share them seamlessly with your verified care team.
              </p>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto flex-shrink-0">
              <div
                onClick={() => setActiveTab('documents')}
                className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'documents'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200/80 text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-lg sm:text-2xl font-bold tracking-tight mb-0.5">
                  {documents.length}
                </div>
                <div
                  className={`text-[10px] sm:text-[11px] font-medium leading-tight ${
                    activeTab === 'documents' ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Medical Records
                </div>
              </div>

              <div
                onClick={() => setActiveTab('doctors')}
                className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'doctors'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200/80 text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-lg sm:text-2xl font-bold tracking-tight mb-0.5">
                  {doctors.length}
                </div>
                <div
                  className={`text-[10px] sm:text-[11px] font-medium leading-tight ${
                    activeTab === 'doctors' ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Care Team
                </div>
              </div>

              <div
                onClick={() => setActiveTab('chats')}
                className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'chats'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200/80 text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-lg sm:text-2xl font-bold tracking-tight mb-0.5">
                  {prescriptions.length}
                </div>
                <div
                  className={`text-[10px] sm:text-[11px] font-medium leading-tight ${
                    activeTab === 'chats' ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Consultations
                </div>
              </div>
            </div>
          </div>

          {/* Pending Doctor Access Requests (Alert Banner) */}
          {requests.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">
                      Doctor Access Request Pending ({requests.length})
                    </p>
                    <p className="text-xs text-slate-600">
                      {requests[0].doctor?.full_name || 'A clinician'} requested access to review your health records.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleUpdateLink(requests[0].id, 'active')}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Accept Link
                  </button>
                  <button
                    onClick={() => handleUpdateLink(requests[0].id, 'rejected')}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Decline
                  </button>
                  {requests.length > 1 && (
                    <button
                      onClick={() => setActiveTab('doctors')}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline px-1"
                    >
                      View all ({requests.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Workspace Segmented Tabs */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <nav className="flex items-center p-1 bg-slate-200/70 rounded-xl gap-1 overflow-x-auto max-w-full no-scrollbar">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex-shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Medical Records</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                {documents.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('chats')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex-shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'chats'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Consultations</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                {prescriptions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('doctors')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex-shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'doctors'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Care Team</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                {doctors.length}
              </span>
            </button>
          </nav>

          {/* Add Record button directly above the Records Section */}
          {activeTab === 'documents' && (
            <button
              onClick={() => setShowRecordModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98] w-full sm:w-auto cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Record</span>
            </button>
          )}

          {/* Quick Doctor ID Connect Bar (visible in Doctors or right side) */}
          {activeTab === 'doctors' && (
            <div className="flex items-center gap-2 max-w-sm w-full">
              <input
                type="text"
                placeholder="Enter 8-digit Doctor ID"
                value={doctorIdInput}
                onChange={(e) => setDoctorIdInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 font-mono uppercase"
              />
              <button
                onClick={addDoctor}
                className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors flex-shrink-0"
              >
                Connect
              </button>
            </div>
          )}
        </section>

        {/* TAB 1: MEDICAL RECORDS */}
        {activeTab === 'documents' && (
          <section className="space-y-4">
            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search records by title, notes, or filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-900 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Cards Grid */}
            {filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocuments.map((doc) => {
                  const hasSummary = Boolean(doc.summary || summaries[doc.id])
                  const isCurrentSummarizing = Boolean(summarizing[doc.id])

                  return (
                    <div
                      key={doc.id}
                      className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between group"
                    >
                      {/* Top Info */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadgeClass(
                                doc.type
                              )}`}
                            >
                              {doc.type || 'Other'}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Calendar className="h-3 w-3" />
                              {doc.uploaded_at
                                ? new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Uploaded'}
                            </span>
                          </div>

                          {/* Quick AI Translation Badge */}
                          {hasSummary ? (
                            <button
                              onClick={() => handleViewDocument(doc, 'summary')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="Click to view AI Explanation"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>AI Explained</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSummarize(doc)}
                              disabled={isCurrentSummarizing}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors disabled:opacity-50"
                              title="Generate plain-English explanation"
                            >
                              {isCurrentSummarizing ? (
                                <Loader2 className="h-3 w-3 animate-spin text-slate-700" />
                              ) : (
                                <Sparkles className="h-3 w-3 text-slate-600" />
                              )}
                              <span>{isCurrentSummarizing ? 'Translating...' : 'Clarify with AI'}</span>
                            </button>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-900 transition-colors mb-1">
                          {doc.title || 'Untitled Medical Record'}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                          {doc.description || 'No clinical notes provided for this file.'}
                        </p>

                        {/* File details pill */}
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 w-fit max-w-full truncate">
                          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                          <span className="truncate">{doc.filename}</span>
                          <span className="uppercase text-[10px] text-slate-400 font-sans">
                            ({doc.file_type || 'doc'})
                          </span>
                        </div>
                      </div>

                      {/* Card Action Strip */}
                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDocument(doc, hasSummary ? 'summary' : 'original')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Record</span>
                          </button>

                          <button
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from('patient_documents')
                                .createSignedUrl(doc.storage_path, 60)
                              if (data) window.open(data.signedUrl, '_blank')
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                            title="Download original file"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Download</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete this record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'No matching records found'
                    : 'Your health records vault is empty'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'Try adjusting your search keywords or clear the category filter.'
                    : 'Upload any lab result, blood test, or prescription to get instant plain-English clarity.'}
                </p>
                {searchQuery || selectedCategory !== 'All' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('All')
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <button
                    onClick={() => setShowRecordModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Upload First Record</span>
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: CONSULTATIONS & PRESCRIPTIONS */}
        {activeTab === 'chats' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Physician Consultations</h2>
                <p className="text-xs text-slate-500">
                  Prescription threads and direct messaging loops with your verified clinicians.
                </p>
              </div>
            </div>

            {prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setExpandedRx(p.id)
                      loadRxDetails(p.id)
                    }}
                    className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            Dr. {p.doctor?.full_name || 'Verified Physician'}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600">
                            ID: {p.doctor?.public_id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(p.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">Active Care Thread</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedRx(p.id)
                          loadRxDetails(p.id)
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>Open Conversation</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePrescription(p.id)
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Thread"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No Consultation Threads</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                  When your connected doctor issues a digital prescription or initiates a consultation, it will appear here.
                </p>
                <button
                  onClick={() => setActiveTab('doctors')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  Manage Care Team
                </button>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: CARE TEAM & DOCTORS */}
        {activeTab === 'doctors' && (
          <section className="space-y-6">
            {/* Connect Doctor Box */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="max-w-xl">
                <h2 className="text-base font-bold text-slate-900 mb-1">Add a Clinician to Your Care Team</h2>
                <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                  Enter your physician's 8-character MedLink public ID to grant them permission to review your
                  uploaded diagnostic reports.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Enter 8-digit Doctor ID (e.g. DOC-9821)"
                    value={doctorIdInput}
                    onChange={(e) => setDoctorIdInput(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 font-mono uppercase"
                  />
                  <button
                    onClick={addDoctor}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Connect Doctor</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pending Requests Grid */}
            {requests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Pending Link Requests ({requests.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{req.doctor?.full_name}</p>
                        <p className="text-xs text-slate-500 font-mono">ID: {req.doctor?.public_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateLink(req.id, 'active')}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateLink(req.id, 'rejected')}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Doctors Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Clinicians ({doctors.length})
              </h3>
              {doctors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctors.map((d) => (
                    <div
                      key={d.id}
                      className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden border border-slate-200">
                            {d.doctor?.avatar_url ? (
                              <img
                                src={d.doctor.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{d.doctor?.full_name ? d.doctor.full_name[0].toUpperCase() : 'D'}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              Dr. {d.doctor?.full_name || 'Clinician'}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                ID: {d.doctor?.public_id}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                <CheckCircle2 className="h-3 w-3" /> Linked
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveDoctor(d.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Doctor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => navigate(`/profile/${d.doctor_id}`)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                        >
                          <span>View Profile</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => {
                            setExpandedRx('LINK_' + d.id)
                            loadGlobalChat(d.id)
                          }}
                          className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>Direct Message</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Users className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No Doctors Connected</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
                    Ask your doctor for their MedLink 8-character ID to link them and enable shared medical records.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* MODAL: ADD MEDICAL RECORD */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Add Medical Record</h3>
                <p className="text-xs text-slate-500">
                  Upload lab reports, prescriptions, or imaging documents.
                </p>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div data-lenis-prevent className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Record Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complete Blood Count (CBC) or Lipid Panel"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm font-medium transition-colors"
                  value={recordForm.title}
                  onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors"
                  value={recordForm.type}
                  onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                >
                  <option value="Lab Result">Lab Result (Blood, Urine, Pathology)</option>
                  <option value="Prescription">Doctor Prescription</option>
                  <option value="Diagnosis">Clinical Diagnosis & Notes</option>
                  <option value="Treatment">Treatment Plan</option>
                  <option value="Vaccination">Vaccination Record</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Clinical Notes / Context (Optional)
                </label>
                <textarea
                  placeholder="Doctor, lab facility, or any symptoms you noticed..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors resize-none"
                  value={recordForm.description}
                  onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Attach Document <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-5 text-center transition-colors relative cursor-pointer group bg-slate-50/50">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => setRecordForm({ ...recordForm, file: e.target.files[0] })}
                  />
                  {recordForm.file ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Check className="h-5 w-5" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-xs">
                          {recordForm.file.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {(recordForm.file.size / 1024).toFixed(1)} KB • Ready to upload
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto text-slate-500 group-hover:scale-105 transition-transform">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-[11px] text-slate-400">PDF, PNG, JPG (Diagnostic reports, scans)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecord}
                disabled={uploading}
                className="px-5 py-2 bg-slate-900 text-white font-semibold text-xs sm:text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{uploading ? 'Encrypting & Uploading...' : 'Save Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DOCUMENT VIEWER & AI EXPLANATION */}
      {activeSummaryDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                      activeSummaryDoc.type
                    )}`}
                  >
                    {activeSummaryDoc.type || 'Other'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {activeSummaryDoc.uploaded_at
                      ? new Date(activeSummaryDoc.uploaded_at).toLocaleDateString()
                      : 'Unknown Date'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">
                  {activeSummaryDoc.title || activeSummaryDoc.filename}
                </h3>
              </div>

              <button
                onClick={() => setActiveSummaryDoc(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Segmented Switcher */}
            <div className="px-5 pt-3 border-b border-slate-100 bg-white">
              <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1 mb-2">
                <button
                  onClick={() => setViewDocTab('summary')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewDocTab === 'summary'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-slate-700" />
                  <span>AI Plain-English Summary</span>
                </button>

                <button
                  onClick={() => setViewDocTab('original')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewDocTab === 'original'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-slate-700" />
                  <span>Original Document</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div data-lenis-prevent className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
              {/* TAB: SUMMARY */}
              {viewDocTab === 'summary' && (
                <div className="space-y-4">
                  {activeSummaryDoc.summary || summaries[activeSummaryDoc.id] ? (
                    <div className="space-y-4">
                      {/* Clinical Guardrail Alert */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Educational Translation Only:</strong> MedLink translates medical jargon to help you
                          prepare questions. It does not provide autonomous medical diagnosis. Share with your verified
                          physician.
                        </span>
                      </div>

                      {/* AI Summary Structured Report */}
                      <MedicalReportSummary
                        summary={activeSummaryDoc.summary || summaries[activeSummaryDoc.id]}
                      />

                      {/* Regenerate Action */}
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-[11px] text-slate-400">Multimodal Gemini 2.5 Flash translation</p>
                        <button
                          onClick={() => handleSummarize(activeSummaryDoc, true)}
                          disabled={summarizing[activeSummaryDoc.id]}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${
                              summarizing[activeSummaryDoc.id] ? 'animate-spin' : ''
                            }`}
                          />
                          <span>{summarizing[activeSummaryDoc.id] ? 'Regenerating...' : 'Regenerate'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Generate Summary CTA */
                    <div className="text-center py-12 max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-500">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">No AI Summary Yet</h4>
                      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                        Generate a plain-English medical translation to understand dense lab numbers and prepare
                        clarifying questions for your doctor.
                      </p>
                      <button
                        onClick={() => handleSummarize(activeSummaryDoc)}
                        disabled={summarizing[activeSummaryDoc.id]}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {summarizing[activeSummaryDoc.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span>
                          {summarizing[activeSummaryDoc.id]
                            ? 'Analyzing Document...'
                            : 'Generate Plain-English Translation'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ORIGINAL DOCUMENT */}
              {viewDocTab === 'original' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 truncate" title={activeSummaryDoc.filename}>
                          {activeSummaryDoc.filename}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          Format: {activeSummaryDoc.file_type || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('patient_documents')
                            .createSignedUrl(activeSummaryDoc.storage_path, 60)
                          if (data) window.open(data.signedUrl, '_blank')
                        }}
                        className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open in New Tab</span>
                      </button>

                      <button
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('patient_documents')
                            .createSignedUrl(activeSummaryDoc.storage_path, 60)
                          if (data) {
                            const link = document.createElement('a')
                            link.href = data.signedUrl
                            link.download = activeSummaryDoc.filename
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          }
                        }}
                        className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {activeSummaryDoc.description && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Patient Notes
                      </p>
                      <p className="text-xs sm:text-sm text-slate-700">{activeSummaryDoc.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm('Permanently delete this medical record?')) {
                    handleDeleteDocument(activeSummaryDoc)
                    setActiveSummaryDoc(null)
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Record</span>
              </button>

              <button
                onClick={() => setActiveSummaryDoc(null)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL (DIRECT / RX MESSAGING) */}
      {expandedRx && (
        <ChatModal
          isOpen={true}
          onClose={() => setExpandedRx(null)}
          prescription={
            expandedRx.startsWith('LINK_')
              ? null
              : {
                  ...(prescriptions.find((p) => p.id === expandedRx) || {}),
                  documents: rxDocs[expandedRx] || [],
                }
          }
          doctorName={
            expandedRx.startsWith('LINK_')
              ? doctors.find((d) => d.id === expandedRx.replace('LINK_', ''))?.doctor?.full_name
              : prescriptions.find((p) => p.id === expandedRx)?.doctor?.full_name
          }
          messages={messages[expandedRx] || []}
          currentUserId={profile?.id}
          role="patient"
          error={chatError}
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
