import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FileText, Upload, Plus, LogOut, Search, Trash2, X, ChevronDown, ChevronUp, MessageCircle, Send, Sparkles, Loader2, Brain } from 'lucide-react'
import { extractTextFromUrl } from '../lib/textUtils'
import { generateMedicalSummary } from '../lib/ai'
import MedicalChatbot from '../components/MedicalChatbot'


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
    const [activeTab, setActiveTab] = useState('documents') // documents, prescriptions, doctors
    const [expandedRx, setExpandedRx] = useState(null) // ID of expanded prescription
    const [rxDocs, setRxDocs] = useState({}) // { rxId: [docs] }
    const [messages, setMessages] = useState({}) // { rxId: [messages] }
    const [newMessage, setNewMessage] = useState('')

    // AI Summary State
    const [summarizing, setSummarizing] = useState({}) // { docId: boolean }
    const [summaries, setSummaries] = useState({}) // { docId: string }

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

        // Load messages
        const { data: msgs } = await supabase
            .from('prescription_messages')
            .select('*, sender:profiles!sender_id(full_name, role)')
            .eq('prescription_id', rxId)
            .order('created_at', { ascending: true })
        setMessages(prev => ({ ...prev, [rxId]: msgs || [] }))
    }

    const sendMessage = async (rxId) => {
        if (!newMessage.trim()) return
        try {
            await supabase.from('prescription_messages').insert({
                prescription_id: rxId,
                sender_id: profile.id,
                message_text: newMessage
            })
            setNewMessage('')
            loadRxDetails(rxId)
        } catch (error) {
            alert('Failed to send message')
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/')
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
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
                    file_type: fileExt
                })

            if (dbError) throw dbError

            // Refresh
            console.log("Upload success, reloading data...")
            await loadData(profile.id)
            console.log("Data reloaded.")

        } catch (error) {
            console.error("Upload flow error:", error)
            alert('Upload failed: ' + error.message)
            setDebugError(error.message)
        } finally {
            setUploading(false)
        }
    }

    async function handleSummarize(doc) {
        if (summaries[doc.id]) {
            setSummaries(prev => {
                const next = { ...prev }
                delete next[doc.id]
                return next
            })
            return
        }

        try {
            setSummarizing(prev => ({ ...prev, [doc.id]: true }))

            // 1. Get URL
            const { data, error } = await supabase.storage
                .from('patient_documents')
                .createSignedUrl(doc.storage_path, 300) // 5 mins for processing

            if (error) throw error

            // 2. Extract Text
            const text = await extractTextFromUrl(data.signedUrl)

            // 3. Generate Summary
            const summary = await generateMedicalSummary(text)

            setSummaries(prev => ({ ...prev, [doc.id]: summary }))
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
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <span className="text-xl font-bold text-blue-600">MedLink Patient</span>
                        <div className="flex items-center space-x-4">
                            <div className="text-right mr-4">
                                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                                <p className="text-xs text-gray-500">ID: {profile?.public_id}</p>
                            </div>
                            <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600">
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Sidebar / Actions */}
                    <div className="space-y-6">

                        {/* Pending Requests */}
                        {requests.length > 0 && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
                                <h3 className="flex items-center text-sm font-bold text-orange-600 uppercase tracking-wide mb-4">
                                    <Sparkles className="h-4 w-4 mr-2" /> Pending Requests
                                </h3>
                                <div className="space-y-4">
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-gray-50 p-3 rounded-lg">
                                            <p className="font-medium text-sm">{req.doctor?.full_name}</p>
                                            <div className="mt-2 flex space-x-2">
                                                <button
                                                    onClick={() => respondToRequest(req.id, 'active')}
                                                    className="flex-1 bg-green-100 text-green-700 py-1 rounded hover:bg-green-200 flex justify-center"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => rejectRequest(req.id)}
                                                    className="flex-1 bg-red-100 text-red-700 py-1 rounded hover:bg-red-200 flex justify-center"
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
                        <div className="bg-white p-6 rounded-xl shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Add Doctor</h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Enter Doctor ID"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    value={doctorIdInput}
                                    onChange={(e) => setDoctorIdInput(e.target.value)}
                                />
                                <button
                                    onClick={addDoctor}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex justify-center items-center"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Connect
                                </button>
                            </div>
                        </div>

                        {/* Upload File */}
                        <div className="bg-white p-6 rounded-xl shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Upload Document</h3>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {uploading ? (
                                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                                ) : (
                                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                                )}
                                <p className="mt-2 text-sm text-gray-500">
                                    {uploading ? 'Uploading...' : 'Click or Drag file here'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-8">

                        {/* Tabs */}
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('documents')}
                                    className={`${activeTab === 'documents' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                >
                                    My Documents
                                </button>
                                <button
                                    onClick={() => setActiveTab('prescriptions')}
                                    className={`${activeTab === 'prescriptions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                >
                                    Prescriptions
                                </button>
                                <button
                                    onClick={() => setActiveTab('doctors')}
                                    className={`${activeTab === 'doctors' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                >
                                    My Doctors
                                </button>
                            </nav>
                        </div>

                        {/* Tab Views */}
                        {activeTab === 'documents' && (
                            <div className="space-y-4">
                                {documents.map(doc => {
                                    if (!doc || !doc.id) {
                                        console.error("Invalid document encountered:", doc);
                                        return null;
                                    }
                                    return (
                                        <div key={doc.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center">
                                                    <FileText className="h-8 w-8 text-blue-600 bg-blue-50 p-1.5 rounded-lg mr-4" />
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">{doc.filename || 'Unnamed File'}</h4>
                                                        <p className="text-sm text-gray-500">
                                                            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Unknown Date'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <a
                                                        href="#"
                                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                        onClick={async (e) => {
                                                            e.preventDefault()
                                                            if (!doc.storage_path) return;
                                                            const win = window.open('', '_blank')
                                                            try {
                                                                const { data, error } = await supabase.storage.from('patient_documents').createSignedUrl(doc.storage_path, 60)
                                                                if (error) throw error
                                                                if (data) win.location.href = data.signedUrl
                                                            } catch (err) {
                                                                win.close()
                                                                console.error(err)
                                                                alert('Failed to open document')
                                                            }
                                                        }}
                                                    >
                                                        View
                                                    </a>
                                                    <button
                                                        onClick={() => handleSummarize(doc)}
                                                        disabled={summarizing[doc.id]}
                                                        className="text-purple-600 hover:text-purple-800 text-sm flex items-center gap-1 disabled:opacity-50"
                                                        title="Generate AI Summary"
                                                    >
                                                        {summarizing[doc.id] ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Brain className="h-4 w-4" />
                                                        )}
                                                        {summarizing[doc.id] ? 'AI...' : 'Summarize'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDocument(doc)}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                        title="Delete document"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            {summaries[doc.id] && (
                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                    <h5 className="font-semibold text-sm text-purple-700 flex items-center gap-1 mb-2">
                                                        <Sparkles className="h-4 w-4" /> AI Summary:
                                                    </h5>
                                                    <p className="text-sm text-gray-700 bg-purple-50 p-3 rounded-lg whitespace-pre-wrap mb-2">
                                                        {summaries[doc.id]}
                                                    </p>
                                                    <p className="text-xs text-gray-500 italic">
                                                        Disclaimer: AI-generated summary for informational purposes only. Not a medical diagnosis.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {documents.length === 0 && <p className="text-gray-500 text-center py-8">No documents uploaded yet.</p>}
                            </div>
                        )
                        }

                        {activeTab === 'prescriptions' && (
                            <div className="space-y-4">
                                {prescriptions.map(p => (
                                    <div key={p.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-900">Dr. {p.doctor?.full_name}</h4>
                                                <p className="text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (expandedRx === p.id) {
                                                        setExpandedRx(null)
                                                    } else {
                                                        setExpandedRx(p.id)
                                                        loadRxDetails(p.id)
                                                    }
                                                }}
                                                className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                                            >
                                                <MessageCircle className="h-4 w-4 mr-1" />
                                                {expandedRx === p.id ? 'Hide' : 'View Details'}
                                            </button>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-lg text-gray-800 whitespace-pre-wrap mb-4">
                                            {p.medication_text}
                                        </div>

                                        {/* Expanded view with documents and messages */}
                                        {expandedRx === p.id && (
                                            <div className="border-t pt-4 space-y-4">
                                                {/* Documents */}
                                                {rxDocs[p.id] && rxDocs[p.id].length > 0 && (
                                                    <div>
                                                        <h5 className="font-semibold text-sm text-gray-700 mb-2">Attached Documents:</h5>
                                                        <div className="space-y-2">
                                                            {rxDocs[p.id].map(doc => (
                                                                <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                                    <span className="text-sm text-gray-700">{doc.filename}</span>
                                                                    <a
                                                                        href="#"
                                                                        onClick={async (e) => {
                                                                            e.preventDefault()
                                                                            const win = window.open('', '_blank')
                                                                            try {
                                                                                const { data, error } = await supabase.storage.from('patient_documents').createSignedUrl(doc.storage_path, 60)
                                                                                if (error) throw error
                                                                                if (data) win.location.href = data.signedUrl
                                                                            } catch (err) {
                                                                                win.close()
                                                                                console.error('Error opening document:', err)
                                                                                alert('Failed to open document.')
                                                                            }
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                                                    >
                                                                        View
                                                                    </a>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Messages */}
                                                <div>
                                                    <h5 className="font-semibold text-sm text-gray-700 mb-2">Messages:</h5>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                                                        {rxMessages[p.id] && rxMessages[p.id].length > 0 ? rxMessages[p.id].map(msg => (
                                                            <div key={msg.id} className={`p-2 rounded text-sm ${msg.sender.role === 'patient' ? 'bg-blue-100 text-right' : 'bg-gray-100'}`}>
                                                                <p className="font-medium text-xs text-gray-600">{msg.sender.full_name}</p>
                                                                <p>{msg.message_text}</p>
                                                            </div>
                                                        )) : <p className="text-gray-500 text-sm text-center py-2">No messages yet</p>}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Type a message..."
                                                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                                            value={newMessage}
                                                            onChange={(e) => setNewMessage(e.target.value)}
                                                            onKeyPress={(e) => e.key === 'Enter' && sendMessage(p.id)}
                                                        />
                                                        <button
                                                            onClick={() => sendMessage(p.id)}
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                                        >
                                                            <Send className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {prescriptions.length === 0 && <p className="text-gray-500 text-center py-8">No prescriptions received.</p>}
                            </div>
                        )}

                        {activeTab === 'doctors' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {doctors.map(d => (
                                    <div key={d.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="bg-indigo-100 p-2 rounded-full mr-4">
                                                <User className="h-6 w-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{d.doctor?.full_name}</h4>
                                                <p className="text-sm text-gray-500">ID: {d.doctor?.public_id}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveDoctor(d.id)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                {doctors.length === 0 && <p className="text-gray-500 col-span-2 text-center py-8">No doctors linked.</p>}
                            </div>
                        )}

                    </div>
                </div>
            </main>
            <MedicalChatbot />
        </div>

    )
}
