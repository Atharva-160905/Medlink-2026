
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FileText, Upload, Plus, LogOut, Search, Trash2, X, ChevronDown, ChevronUp, MessageCircle, Send, Sparkles, Loader2, Brain, Check, User, Users, Activity, Eye, Clock } from 'lucide-react'

import { extractTextFromUrl } from '../lib/textUtils'
import { generateMedicalSummary } from '../lib/ai'
import MedicalChatbot from '../components/MedicalChatbot'
import ChatModal from '../components/ChatModal'


export default function PatientDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState(null)

    // Data
    const [documents, setDocuments] = useState([])
    const [prescriptions, setPrescriptions] = useState([])
    const [doctors, setDoctors] = useState([]) // Linked doctors
    const [requests, setRequests] = useState([]) // Pending requests from doctors
    const [debugError, setDebugError] = useState(null) // New debug state

    // UI State
    const [doctorIdInput, setDoctorIdInput] = useState('')
    const [uploading, setUploading] = useState(false)
    const [activeTab, setActiveTab] = useState('chats') // documents, prescriptions, doctors
    const [expandedRx, setExpandedRx] = useState(null) // ID of expanded prescription
    const [rxDocs, setRxDocs] = useState({}) // { rxId: [docs] }
    const [chatError, setChatError] = useState(null)
    const [messages, setMessages] = useState({}) // { rxId: [messages] }
    const [newMessage, setNewMessage] = useState('')

    // AI Summary State
    const [summarizing, setSummarizing] = useState({}) // { docId: boolean }
    const [summaries, setSummaries] = useState({}) // { docId: string }
    const [activeSummaryDoc, setActiveSummaryDoc] = useState(null) // Doc to show in modal


    useEffect(() => {
        if (expandedRx) setChatError(null)
    }, [expandedRx])

    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
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
            // Join doctor profile to get name
            const { data: rx } = await supabase
                .from('prescriptions')
                .select('*, doctor:profiles!doctor_id(full_name)')
                .eq('patient_id', userId)
                .order('created_at', { ascending: false })
            setPrescriptions(rx || [])

            // 3. Links (Active & Pending)
            const { data: links } = await supabase
                .from('doctor_patient_links')
                .select('*, doctor:profiles!doctor_id(full_name, public_id)')
                .eq('patient_id', userId)

            const active = links?.filter(l => l.status === 'active') || []
            const pending = links?.filter(l => l.status === 'pending') || []

            setDoctors(active)
            setRequests(pending)

        } catch (error) {
            console.error("Error loading data:", error)
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
        setRxDocs(prev => ({ ...prev, [rxId]: docs || [] }))

        // Find the link_id for this doctor
        const rx = prescriptions.find(p => p.id === rxId)
        if (!rx) return

        const link = doctors.find(d => d.doctor_id === rx.doctor_id)
        if (!link) return // Should not happen if linked

        // Load unified messages using link_id
        try {
            const { data: msgs, error } = await supabase
                .from('direct_messages')
                .select('*, sender:profiles!sender_id(full_name, role)')
                .eq('link_id', link.id)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMessages(prev => ({ ...prev, [rxId]: msgs || [] }))
        } catch (err) {
            console.error('Chat Load Error:', err)
            setChatError('Chat Error: ' + (err.message || 'Unknown error'))
        }
    }

    const sendMessage = async (rxId, text) => {
        if (!text?.trim()) return

        // Handle Global Chat
        if (rxId.startsWith('LINK_')) {
            const linkId = rxId.replace('LINK_', '')
            return sendGlobalMessage(linkId, text)
        }

        const rx = prescriptions.find(p => p.id === rxId)
        if (!rx) return

        const link = doctors.find(d => d.doctor_id === rx.doctor_id)
        if (!link) {
            alert("No active link with this doctor")
            return
        }

        try {
            await supabase.from('direct_messages').insert({
                link_id: link.id,
                sender_id: profile.id,
                message_text: text
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
            setMessages(prev => ({ ...prev, [`LINK_${linkId}`]: msgs || [] }))
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
                message_text: text
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

    // Record Modal State
    const [showRecordModal, setShowRecordModal] = useState(false)
    const [recordForm, setRecordForm] = useState({ title: '', type: 'Other', description: '', file: null })

    const [viewDocTab, setViewDocTab] = useState('original')

    const handleViewDocument = (doc) => {
        setActiveSummaryDoc(doc)
        setViewDocTab('original')
    }

    const handleDeletePrescription = async (rxId) => {
        if (!confirm('Delete this prescription thread?')) return
        try {
            const { error } = await supabase.from('prescriptions').delete().eq('id', rxId)
            if (error) throw error
            setPrescriptions(prev => prev.filter(p => p.id !== rxId))
            if (expandedRx === rxId) setExpandedRx(null)
        } catch (error) {
            alert('Failed to delete: ' + error.message)
        }
    }

    const handleAddRecord = async () => {
        if (!recordForm.file || !recordForm.title) {
            alert("Please provide a title and select a file.")
            return
        }

        setUploading(true)
        try {
            const file = recordForm.file
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt} `
            const filePath = `${profile.id}/${fileName}`

            // Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('patient_documents')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Record in DB
            const { error: dbError } = await supabase
                .from('documents')
                .insert({
                    patient_id: profile.id,
                    filename: file.name,
                    storage_path: filePath,
                    file_type: fileExt,
                    title: recordForm.title,
                    type: recordForm.type,
                    description: recordForm.description
                })

            if (dbError) throw dbError

            // Refresh & Reset
            await loadData(profile.id)
            setRecordForm({ title: '', type: 'Other', description: '', file: null })
            setShowRecordModal(false)

        } catch (error) {
            console.error("Upload flow error:", error)
            alert('Upload failed: ' + error.message)
            setDebugError(error.message)
        } finally {
            setUploading(false)
        }
    }

    async function handleSummarize(doc, forceRegenerate = false) {
        // 1. If we have a stored summary and not forcing regen, just open modal
        const existingSummary = doc.summary || summaries[doc.id]
        if (existingSummary && !forceRegenerate) {
            setActiveSummaryDoc({ ...doc, summary: existingSummary })
            return
        }

        try {
            setSummarizing(prev => ({ ...prev, [doc.id]: true }))

            // Get URL & Extract
            const { data, error } = await supabase.storage
                .from('patient_documents')
                .createSignedUrl(doc.storage_path, 300)
            if (error) throw error

            const text = await extractTextFromUrl(data.signedUrl)
            const summary = await generateMedicalSummary(text)

            // Save to DB
            const { error: updateError } = await supabase
                .from('documents')
                .update({ summary: summary })
                .eq('id', doc.id)

            if (updateError) throw updateError

            // Update State
            setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, summary } : d))
            setSummaries(prev => ({ ...prev, [doc.id]: summary }))

            // Open Modal immediately with new summary
            setActiveSummaryDoc({ ...doc, summary })

        } catch (err) {
            console.error(err)
            alert('Failed to generate summary: ' + err.message)
        } finally {
            setSummarizing(prev => ({ ...prev, [doc.id]: false }))
        }
    }



    const addDoctor = async () => {
        if (!doctorIdInput) return

        try {
            // Find doctor by public ID
            const { data: doc, error: docError } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'doctor')
                .eq('public_id', doctorIdInput)
                .single()

            if (docError || !doc) {
                alert('Doctor not found with that ID')
                return
            }

            // Create Active Link (Patient initiated)
            const { error: linkError } = await supabase
                .from('doctor_patient_links')
                .insert({
                    doctor_id: doc.id,
                    patient_id: profile.id,
                    status: 'active',
                    created_by: 'patient'
                })

            if (linkError) {
                if (linkError.code === '23505') alert('Already linked!')
                else throw linkError
            } else {
                alert('Doctor added successfully!')
                setDoctorIdInput('')
                loadData(profile.id)
            }

        } catch (error) {
            alert('Error adding doctor: ' + error.message)
        }
    }

    const respondToRequest = async (linkId, status) => {
        try {
            const { error } = await supabase
                .from('doctor_patient_links')
                .update({ status })
                .eq('id', linkId)

            if (error) throw error
            loadData(profile.id)
        } catch (error) {
            alert('Action failed')
        }
    }

    const rejectRequest = async (linkId) => {
        if (!confirm('Reject request?')) return
        try {
            const { error } = await supabase
                .from('doctor_patient_links')
                .delete()
                .eq('id', linkId)

            if (error) throw error
            loadData(profile.id)
        } catch (error) {
            alert('Action failed')
        }
    }

    const handleDeleteDocument = async (doc) => {
        if (!confirm('Delete this document permanently?')) return
        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('patient_documents')
                .remove([doc.storage_path])

            if (storageError) console.warn('Storage delete warning:', storageError)

            // Delete from database
            const { error: dbError } = await supabase
                .from('documents')
                .delete()
                .eq('id', doc.id)

            if (dbError) throw dbError

            // Refresh
            loadData(profile.id)
            alert('Document deleted successfully')
        } catch (error) {
            alert('Delete failed: ' + error.message)
        }
    }


    const handleUpdateLink = async (linkId, status) => {
        if (status === 'rejected') {
            if (!confirm('Reject this doctor request?')) return
            const { error } = await supabase.from('doctor_patient_links').delete().eq('id', linkId)
            if (error) alert('Error rejecting: ' + error.message)
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
        if (!confirm('Remove this doctor? They will lose access to your data.')) return
        try {
            const { error } = await supabase
                .from('doctor_patient_links')
                .delete()
                .eq('id', linkId)

            if (error) throw error
            loadData(profile.id)
            alert('Doctor removed successfully')
        } catch (error) {
            alert('Failed to remove doctor: ' + error.message)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

    if (debugError) return (
        <div className="p-8 text-center">
            <h2 className="text-red-600 text-xl font-bold">Something went wrong</h2>
            <pre className="mt-4 bg-gray-100 p-4 rounded text-left overflow-auto">{debugError}</pre>
            <button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Reload</button>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-12 relative">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-400/5 rounded-full blur-3xl" />
            </div>

            {/* Navbar */}
            <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-1.5 rounded-lg shadow-md shadow-blue-500/20">
                                <Activity className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight">MedLink <span className="text-blue-600 font-normal">Patient</span></span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div
                                onClick={() => navigate('/profile')}
                                className="text-right hidden sm:block cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors group"
                            >
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{profile?.full_name}</p>
                                <p className="text-xs text-slate-500 font-mono">ID: {profile?.public_id}</p>
                            </div>
                            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                                title="Sign out"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pointer-events-auto">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Sidebar / Actions */}
                    <div className="space-y-6">

                        {/* Pending Requests */}
                        {requests.length > 0 && (
                            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl shadow-orange-100/50 border border-orange-100">
                                <h3 className="flex items-center text-xs font-bold text-orange-600 uppercase tracking-wider mb-4">
                                    <Sparkles className="h-4 w-4 mr-2" /> Pending Requests
                                </h3>
                                <div className="space-y-3">
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                                            <p className="font-semibold text-sm text-slate-800">{req.doctor?.full_name}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => respondToRequest(req.id, 'active')}
                                                    className="flex-1 bg-green-500 text-white py-1.5 rounded-lg hover:bg-green-600 shadow-lg shadow-green-500/20 flex justify-center transition-all"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => rejectRequest(req.id)}
                                                    className="flex-1 bg-white text-red-500 border border-red-200 py-1.5 rounded-lg hover:bg-red-50 flex justify-center transition-all"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add Doctor */}
                        <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Connect Doctor</h3>
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Enter Doctor ID"
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-medium"
                                        value={doctorIdInput}
                                        onChange={(e) => setDoctorIdInput(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={addDoctor}
                                    className="w-full bg-slate-900 text-white py-2.5 rounded-xl hover:bg-slate-800 flex justify-center items-center shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Connect
                                </button>
                            </div>
                        </div>

                        {/* Add Record */}
                        <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Medical Records</h3>
                            <button
                                onClick={() => setShowRecordModal(true)}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 flex justify-center items-center shadow-lg shadow-blue-600/20 active:scale-95 transition-all font-bold"
                            >
                                <Plus className="h-5 w-5 mr-2" /> Add Record
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Tabs */}
                        <div className="bg-white/50 backdrop-blur-sm p-1.5 rounded-xl inline-flex shadow-sm border border-white/60">
                            {[
                                { id: 'chats', label: 'Chats', icon: MessageCircle },
                                { id: 'prescriptions', label: 'Medical Records', icon: FileText },
                                { id: 'documents', label: 'Documents', icon: FileText },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-white text-blue-600 shadow-md shadow-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                                        }`}
                                >
                                    {/* <tab.icon className="h-4 w-4" /> */}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Views */}
                        {activeTab === 'documents' && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-slate-800">Uploaded Reports</h3>
                                    {documents.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{documents.length} Records</span>}
                                </div>
                                {documents.map(doc => (
                                    <div key={doc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Icon & Details */}
                                            <div className="flex gap-4">
                                                {/* Icon Box */}
                                                <div className="hidden sm:flex h-12 w-12 bg-slate-50 rounded-xl items-center justify-center flex-shrink-0 border border-slate-100">
                                                    <FileText className="h-6 w-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-bold text-lg text-slate-900">{doc.title || "Untitled Record"}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${doc.type === 'Vaccination' ? 'bg-yellow-100 text-yellow-700' :
                                                            doc.type === 'Prescription' ? 'bg-indigo-100 text-indigo-700' :
                                                                doc.type === 'Lab Result' ? 'bg-purple-100 text-purple-700' :
                                                                    'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {doc.type || 'Other'}
                                                        </span>
                                                    </div>

                                                    <p className="text-slate-600 mb-3 text-sm leading-relaxed max-w-xl">
                                                        {doc.description || "No description provided."}
                                                    </p>

                                                    <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                                                        <span className="flex items-center">
                                                            Created: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Unknown Date'}
                                                        </span>
                                                        <span className="flex items-center">
                                                            <FileText className="h-3 w-3 mr-1" /> {doc.filename}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={doc.url}
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        const { data } = await supabase.storage.from('patient_documents').createSignedUrl(doc.storage_path, 60)
                                                        if (data) window.open(data.signedUrl, '_blank')
                                                    }}
                                                    className="flex items-center px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
                                                >
                                                    <Upload className="h-4 w-4 mr-2 rotate-180" /> Download
                                                </a>
                                                <button
                                                    onClick={() => handleViewDocument(doc)}
                                                    className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors"
                                                >
                                                    <Eye className="h-4 w-4 mr-2" /> View
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDocument(doc)}
                                                    className="flex items-center px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {documents.length === 0 && (
                                    <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FileText className="h-10 w-10 text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">No Medical Records</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto mb-6">Keep track of your health history by uploading prescriptions, lab results, and other reports.</p>
                                        <button onClick={() => setShowRecordModal(true)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
                                            Add First Record
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'prescriptions' && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 mb-2 flex items-center">
                                    <div className="bg-indigo-100 p-2 rounded-lg mr-3 text-indigo-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    Detailed Medical History
                                </h3>
                                {prescriptions.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            setExpandedRx(p.id)
                                            loadRxDetails(p.id)
                                        }}
                                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold group-hover:scale-110 transition-transform">
                                                Rx
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-lg">Dr. {p.doctor?.full_name}</h4>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(p.created_at).toLocaleDateString(undefined, { dateStyle: 'full' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Message Preview (Optional - requires backend support for last message, or we just show 'Tap to chat') */}
                                            <div className="hidden sm:block text-right">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                                                <p className="text-sm font-semibold text-green-600">Active</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeletePrescription(p.id)
                                                    }}
                                                    className="bg-red-50 text-red-500 p-2.5 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                    title="Delete Chat"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    className="bg-indigo-50 text-indigo-600 p-2.5 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm group-hover:shadow-indigo-500/30"
                                                >
                                                    <MessageCircle className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {prescriptions.length === 0 && (
                                    <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FileText className="h-10 w-10 text-indigo-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">No Prescriptions</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto">Your medical prescriptions will appear here once added by your doctor.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'chats' && (
                            <div className="space-y-6">
                                {/* Pending Requests */}
                                {requests.length > 0 && (
                                    <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
                                        <h4 className="font-bold text-orange-800 mb-4 flex items-center">
                                            <Activity className="h-5 w-5 mr-2" /> Pending Requests
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {requests.map(req => (
                                                <div key={req.id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-slate-900">{req.doctor?.full_name}</p>
                                                        <p className="text-xs text-slate-500 font-mono">ID: {req.doctor?.public_id}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateLink(req.id, 'active')}
                                                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateLink(req.id, 'rejected')}
                                                            className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Active Doctors */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {doctors.map(d => (
                                        <div
                                            key={d.id}
                                            onClick={() => navigate(`/profile/${d.doctor_id}`)}
                                            className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md hover:bg-white transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center">
                                                <div className="bg-indigo-600 h-10 w-10 p-2 rounded-full mr-4 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{d.doctor?.full_name}</h4>
                                                    <p className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded mt-1">{d.doctor?.public_id}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setExpandedRx('LINK_' + d.id)
                                                        loadGlobalChat(d.id)
                                                    }}
                                                    className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors z-20"
                                                >
                                                    Chat
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveDoctor(d.id);
                                                    }}
                                                    className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove Doctor"
                                                >
                                                    <LogOut className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {doctors.length === 0 && (
                                        <div className="col-span-2 text-center py-16 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                                            <Users className="h-8 w-8 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-500 font-medium">No doctors linked yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>

            {/* Add Record Modal */}
            {
                showRecordModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    Add Medical Record
                                </h3>
                                <button onClick={() => setShowRecordModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Enter record title (e.g., Blood Test Results)"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                                        value={recordForm.title}
                                        onChange={e => setRecordForm({ ...recordForm, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Record Type <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        value={recordForm.type}
                                        onChange={e => setRecordForm({ ...recordForm, type: e.target.value })}
                                    >
                                        <option>Prescription</option>
                                        <option>Lab Result</option>
                                        <option>Diagnosis</option>
                                        <option>Treatment</option>
                                        <option>Vaccination</option>
                                        <option>Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                                    <textarea
                                        placeholder="Enter record description or notes"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all min-h-[80px]"
                                        value={recordForm.description}
                                        onChange={e => setRecordForm({ ...recordForm, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Attach File <span className="text-red-500">*</span></label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer relative group">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={e => setRecordForm({ ...recordForm, file: e.target.files[0] })}
                                        />
                                        <div className="space-y-2">
                                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500 group-hover:scale-110 transition-transform">
                                                <Upload className="h-5 w-5" />
                                            </div>
                                            {recordForm.file ? (
                                                <p className="text-sm font-bold text-blue-600 truncate px-4">{recordForm.file.name}</p>
                                            ) : (
                                                <div className="text-sm text-slate-500">
                                                    <span className="font-bold text-blue-600">Click to upload</span> or drag and drop
                                                    <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG (MAX. 10MB)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowRecordModal(false)}
                                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddRecord}
                                    disabled={uploading}
                                    className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center"
                                >
                                    {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {uploading ? 'Adding...' : 'Add Record'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeSummaryDoc && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-white/10">

                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 bg-white z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-6 w-6 text-slate-400" />
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">{activeSummaryDoc.filename}</h3>
                                            <p className="text-xs text-slate-500 font-medium">Medical Records - {activeSummaryDoc.uploaded_at ? new Date(activeSummaryDoc.uploaded_at).toLocaleDateString() : 'Unknown Date'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveSummaryDoc(null)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${activeSummaryDoc.type === 'Vaccination' ? 'bg-yellow-100 text-yellow-700' :
                                            activeSummaryDoc.type === 'Prescription' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {activeSummaryDoc.type || 'Other'}
                                        </span>
                                        <span className="text-sm text-slate-500 font-medium">{activeSummaryDoc.uploaded_at ? new Date(activeSummaryDoc.uploaded_at).toLocaleDateString() : 'Unknown Date'}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm("Are you sure you want to delete this record?")) {
                                                handleDeleteDocument(activeSummaryDoc)
                                                setActiveSummaryDoc(null)
                                            }
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </button>
                                </div>

                                <p className="mt-4 text-sm text-slate-600 italic">
                                    {activeSummaryDoc.description || "No description provided."}
                                </p>
                            </div>

                            {/* Tabs Switcher */}
                            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-2 mx-6 mt-6 rounded-xl relative">
                                <button
                                    onClick={() => setViewDocTab('summary')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${viewDocTab === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Sparkles className={`h-4 w-4 ${viewDocTab === 'summary' ? 'text-purple-600' : ''}`} />
                                    AI Summary
                                </button>
                                <button
                                    onClick={() => setViewDocTab('original')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${viewDocTab === 'original' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <FileText className={`h-4 w-4 ${viewDocTab === 'original' ? 'text-blue-600' : ''}`} />
                                    Original Document
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-white relative">
                                {viewDocTab === 'original' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                            <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                                                <FileText className="h-4 w-4 text-blue-600" /> Attached Document
                                            </h4>

                                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-blue-100 shadow-sm mb-4">
                                                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-slate-900 truncate" title={activeSummaryDoc.filename}>{activeSummaryDoc.filename}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{(activeSummaryDoc.file_size / 1024).toFixed(1)} KB (Est.)</p>
                                                    {/* Note: File size isn't always available in basic storage metadata unless explicitly saved */}
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                {/* If image, "View in Browser" opens tab. If PDF, same. */}
                                                <button
                                                    onClick={async () => {
                                                        const { data } = await supabase.storage.from('patient_documents').createSignedUrl(activeSummaryDoc.storage_path, 60)
                                                        if (data) window.open(data.signedUrl, '_blank')
                                                    }}
                                                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center"
                                                >
                                                    <Eye className="h-4 w-4 mr-2" /> View in Browser
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const { data } = await supabase.storage.from('patient_documents').createSignedUrl(activeSummaryDoc.storage_path, 60)
                                                        if (data) {
                                                            const link = document.createElement("a");
                                                            link.href = data.signedUrl;
                                                            link.download = activeSummaryDoc.filename;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }
                                                    }}
                                                    className="px-6 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-50 transition-colors flex items-center shadow-sm"
                                                >
                                                    <Upload className="h-4 w-4 mr-2 rotate-180" /> Download
                                                </button>
                                            </div>

                                            {/* Preview Hint */}
                                            {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(activeSummaryDoc.filename.split('.').pop().toLowerCase()) && (
                                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 flex items-start gap-2">
                                                    <span className="font-bold">Image File:</span> Click "View in Browser" to see the full-size image in a new tab.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {viewDocTab === 'summary' && (
                                    <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {(activeSummaryDoc.summary || summaries[activeSummaryDoc.id]) ? (
                                            <div className="w-full text-left space-y-4">
                                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-purple-900 leading-relaxed font-sans text-sm whitespace-pre-wrap">
                                                    {activeSummaryDoc.summary || summaries[activeSummaryDoc.id]}
                                                </div>
                                                <p className="text-[10px] text-slate-400 italic text-center">AI-generated content. Verify with original document.</p>
                                                <button
                                                    onClick={() => handleSummarize(activeSummaryDoc, true)}
                                                    className="mx-auto block text-xs font-bold text-purple-600 hover:text-purple-700"
                                                >
                                                    Regenerate Summary
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="max-w-xs mx-auto">
                                                <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                                <h4 className="text-lg font-bold text-slate-900 mb-2">AI Summary Not Available</h4>
                                                <p className="text-slate-500 text-sm mb-6">No AI summary has been generated for this document yet.</p>
                                                <button
                                                    onClick={() => handleSummarize(activeSummaryDoc)}
                                                    disabled={summarizing[activeSummaryDoc.id]}
                                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                                                >
                                                    {summarizing[activeSummaryDoc.id] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                                    {summarizing[activeSummaryDoc.id] ? 'Generating...' : 'Generate AI Summary'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                                <button
                                    onClick={() => setActiveSummaryDoc(null)}
                                    className="px-8 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {expandedRx && (
                <ChatModal
                    isOpen={true}
                    onClose={() => setExpandedRx(null)}
                    prescription={
                        expandedRx.startsWith('LINK_')
                            ? null
                            : { ...(prescriptions.find(p => p.id === expandedRx) || {}), documents: rxDocs[expandedRx] || [] }
                    }
                    doctorName={
                        expandedRx.startsWith('LINK_')
                            ? doctors.find(d => d.id === expandedRx.replace('LINK_', ''))?.doctor?.full_name
                            : prescriptions.find(p => p.id === expandedRx)?.doctor?.full_name
                    }
                    messages={messages[expandedRx] || []}
                    currentUserId={profile?.id}
                    role="patient"
                    error={chatError}
                    onSendMessage={(text) => sendMessage(expandedRx, text)}
                    onDownloadAttachment={async (doc) => {
                        const { data } = await supabase.storage.from('patient_documents').createSignedUrl(doc.storage_path, 60)
                        if (data) window.open(data.signedUrl, '_blank')
                    }}
                />
            )}

            <MedicalChatbot />

        </div>
    )
}
