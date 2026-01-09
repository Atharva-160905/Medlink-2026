import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FileText, Plus, UserPlus, LogOut, Search, User, File, ArrowLeft, Upload, Send, Trash2, MessageCircle, Activity, Clock, Maximize2 } from 'lucide-react'
import MedicalChatbot from '../components/MedicalChatbot'
import ChatModal from '../components/ChatModal'


export default function DoctorDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState(null)
    const [patients, setPatients] = useState([])

    // UI State
    const [patientIdInput, setPatientIdInput] = useState('')
    const [selectedPatient, setSelectedPatient] = useState(null)

    // Selected Patient Data
    const [patientDocs, setPatientDocs] = useState([])
    const [patientRx, setPatientRx] = useState([])
    const [newRx, setNewRx] = useState('')
    const [uploadFiles, setUploadFiles] = useState([])
    const [expandedRx, setExpandedRx] = useState(null)
    const [messages, setMessages] = useState({})
    const [newMessage, setNewMessage] = useState('')
    const [rxDocs, setRxDocs] = useState({})

    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
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
            .eq('doctor_id', profile.id) // Only my prescriptions? Or all? Spec says "View prescriptions added by doctors" for PATIENT. Doctor can "Edit their own".
            // Let's show only mine for editing, maybe? Or all for context?
            // RLS says "Doctors can view/edit their own prescriptions". It doesn't explicitly say they can view OTHERS'. 
            // Safe bet: view only own.
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
                setRxDocs(prev => ({ ...prev, [prescription.id]: rxDocuments || [] }))
            }
        }
    }

    const addPatient = async () => {
        if (!patientIdInput) return
        try {
            const { data: pat, error: patError } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'patient')
                .eq('public_id', patientIdInput)
                .single()

            if (patError || !pat) {
                alert('Patient not found')
                return
            }

            const { error } = await supabase
                .from('doctor_patient_links')
                .insert({
                    doctor_id: profile.id,
                    patient_id: pat.id,
                    status: 'pending', // Must be accepted by patient
                    created_by: 'doctor' // Corrected from 'patient' to 'doctor'? Wait.
                    // In PatientDashboard, patient adds doctor => created_by='patient'.
                    // Here doctor adds patient => created_by='doctor'.
                })

            if (error) {
                if (error.code === '23505') alert('Request already sent or linked')
                else throw error
            } else {
                alert('Request sent to patient. They must approve it.')
                setPatientIdInput('')
                loadPatients(profile.id)
            }
        } catch (e) {
            alert(e.message)
        }
    }

    const handleAddRx = async (e) => {
        e.preventDefault()
        // Allow text OR files. Schema needs text, so default it if files exist.
        if (!newRx.trim() && uploadFiles.length === 0) return

        const medText = newRx.trim() || 'See attached document(s)'

        try {
            // Create prescription
            const { data: rxData, error: rxError } = await supabase.from('prescriptions').insert({
                doctor_id: profile.id,
                patient_id: selectedPatient.patient.id,
                medication_text: medText
            }).select().single()

            if (rxError) throw rxError

            // Upload files if any
            for (const file of uploadFiles) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `rx_docs/${rxData.id}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('patient_documents')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                await supabase.from('prescription_documents').insert({
                    prescription_id: rxData.id,
                    doctor_id: profile.id,
                    filename: file.name,
                    storage_path: filePath,
                    file_type: fileExt
                })
            }

            setNewRx('')
            setUploadFiles([])
            loadPatientDetails(selectedPatient.patient.id)
        } catch (e) {
            alert(e.message)
        }
    }

    const deletePrescription = async (rxId) => {
        if (!confirm('Are you sure you want to delete this prescription history? This cannot be undone.')) return
        try {
            const { error } = await supabase.from('prescriptions').delete().eq('id', rxId)
            if (error) throw error
            setPatientRx(prev => prev.filter(rx => rx.id !== rxId))
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
            setMessages(prev => ({ ...prev, [rxId]: data || [] }))
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
                message_text: text
            })
            loadMessages(rxId)
        } catch (e) {
            alert(e.message)
        }
    }

    const deletePrescriptionDoc = async (docId, storagePath) => {
        if (!confirm('Delete this document?')) return
        try {
            await supabase.storage.from('patient_documents').remove([storagePath])
            await supabase.from('prescription_documents').delete().eq('id', docId)
            loadPatientDetails(selectedPatient.patient.id)
        } catch (e) {
            alert(e.message)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/')
    }

    if (loading && !selectedPatient) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-12 relative">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />
            </div>

            <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-md shadow-indigo-500/20">
                                <Activity className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight">MedLink <span className="text-indigo-600 font-normal">Doctor</span></span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div
                                onClick={() => navigate('/profile')}
                                className="text-right cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors group flex flex-col items-end"
                            >
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors max-w-[120px] sm:max-w-none truncate">{profile?.full_name}</p>
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

                {selectedPatient ? (
                    // Patient Detail View
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="group flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Patients
                        </button>

                        <div
                            onClick={() => navigate(`/profile/${selectedPatient.patient.id}`)}
                            className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60 cursor-pointer hover:bg-white/90 transition-all group"
                        >
                            <div className="flex flex-col sm:flex-row items-center gap-5">
                                <div className="flex items-center gap-5 w-full sm:w-auto">
                                    <div className="bg-indigo-100 p-4 rounded-full shadow-inner group-hover:scale-105 transition-transform flex-shrink-0">
                                        <User className="h-8 w-8 text-indigo-600" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h2 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{selectedPatient.patient.full_name}</h2>
                                        <p className="text-slate-500 font-mono">ID: {selectedPatient.patient.public_id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setExpandedRx('GLOBAL')
                                        loadMessages('GLOBAL')
                                    }}
                                    className="w-full sm:w-auto ml-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-semibold"
                                >
                                    <MessageCircle className="h-5 w-5" /> Chat
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Documents */}
                            <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60 h-full">
                                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center uppercase tracking-wider">
                                    <FileText className="h-5 w-5 mr-2 text-indigo-600" /> Patient Documents <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{patientDocs.length}</span>
                                </h3>
                                <div className="space-y-3">
                                    {patientDocs.map(doc => (
                                        <div key={doc.id} className="p-4 bg-white/50 border border-slate-100 rounded-xl hover:bg-white hover:shadow-md transition-all flex justify-between items-center group">
                                            <div className="flex items-center overflow-hidden">
                                                <div className="mr-3 p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                    <File className="h-4 w-4" />
                                                </div>
                                                <span className="truncate text-sm font-semibold text-slate-700">{doc.title || doc.filename}</span>
                                            </div>
                                            <a
                                                href="#"
                                                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                                                onClick={async (e) => {
                                                    e.preventDefault()
                                                    const { data } = await supabase.storage.from('patient_documents').createSignedUrl(doc.storage_path, 60)
                                                    if (data) window.open(data.signedUrl, '_blank')
                                                }}
                                            >
                                                VIEW
                                            </a>
                                        </div>
                                    ))}
                                    {patientDocs.length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                                            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-slate-400 text-sm font-medium">No documents shared.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Prescriptions */}
                            <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60 h-full flex flex-col">
                                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center uppercase tracking-wider">
                                    <Plus className="h-5 w-5 mr-2 text-indigo-600" /> Medical Records
                                </h3>

                                <div className="flex-1 space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {patientRx.map(rx => (
                                        <div
                                            key={rx.id}
                                            onClick={() => {
                                                setExpandedRx(rx.id)
                                                loadMessages(rx.id)
                                            }}
                                            className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold group-hover:scale-105 transition-transform flex-shrink-0">
                                                    Rx
                                                </div>
                                                <div className="overflow-hidden flex-1">
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(rx.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-sm font-bold text-slate-700 truncate max-w-full sm:max-w-[200px]">
                                                        {rx.medication_text.substring(0, 30)}{rx.medication_text.length > 30 ? '...' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deletePrescription(rx.id)
                                                    }}
                                                    className="text-red-400 bg-red-50 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                                    title="Delete Chat"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <button className="text-indigo-600 bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors" title="View Details">
                                                    <Maximize2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {patientRx.length === 0 && (
                                        <div className="text-center py-10">
                                            <p className="text-slate-400 text-sm">No prescriptions history.</p>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleAddRx} className="mt-auto border-t border-slate-200 pt-5">
                                    <textarea
                                        placeholder="Write a new prescription..."
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[100px] outline-none transition-all resize-none"
                                        value={newRx}
                                        onChange={(e) => setNewRx(e.target.value)}
                                    />

                                    {/* File Upload */}
                                    <div className="mt-3">
                                        <label className={`flex items-center justify-center w-full p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadFiles.length > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50 hover:border-indigo-400'
                                            }`}>
                                            <Upload className={`h-4 w-4 mr-2 ${uploadFiles.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className={`text-sm font-medium ${uploadFiles.length > 0 ? 'text-indigo-700' : 'text-slate-500'}`}>
                                                {uploadFiles.length > 0 ? `${uploadFiles.length} file(s) selected` : 'Attach documents (optional)'}
                                            </span>
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                                            />
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex justify-center items-center"
                                    >
                                        <Plus className="h-5 w-5 mr-2" /> Add Prescription
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                ) : (
                    // Patient List View
                    <div className="space-y-8 animate-in fade-in duration-500">

                        {/* Add Patient */}
                        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Connect Patient</h3>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Enter Patient Public ID"
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                        value={patientIdInput}
                                        onChange={(e) => setPatientIdInput(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={addPatient}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center whitespace-nowrap"
                                >
                                    <UserPlus className="h-5 w-5 mr-2" /> Send Request
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                                Your Patients
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {patients.length > 0 ? patients.map(link => (
                                    <div
                                        key={link.id}
                                        onClick={() => {
                                            if (link.status === 'active') {
                                                setSelectedPatient(link)
                                                loadPatientDetails(link.patient_id)
                                            }
                                        }}
                                        className={`bg-white/60 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-300 group ${link.status === 'active'
                                            ? 'cursor-pointer hover:shadow-xl hover:shadow-indigo-100/50 border-white/60 hover:-translate-y-1'
                                            : 'opacity-75 border-dashed border-slate-300 bg-slate-50/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center">
                                                <div className={`p-3 rounded-full mr-4 transition-colors ${link.status === 'active' ? 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-200 text-slate-500'
                                                    }`}>
                                                    <User className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-900">{link.patient.full_name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className={`text-xs font-semibold uppercase tracking-wider ${link.status === 'active' ? 'text-green-600' : 'text-orange-500'
                                                            }`}>
                                                            {link.status === 'active' ? 'Active' : 'Pending'}
                                                        </p>
                                                        {link.status === 'active' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    navigate(`/profile/${link.patient_id}`)
                                                                }}
                                                                className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-100 font-bold transition-colors z-10 relative"
                                                            >
                                                                PROFILE
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {link.status === 'active' && <FileText className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <User className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-500 font-medium text-lg">No patients connected yet.</p>
                                        <p className="text-slate-400 text-sm">Send a request to restart managing patients.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

            </main>
            {expandedRx && (
                <ChatModal
                    isOpen={true}
                    onClose={() => setExpandedRx(null)}
                    prescription={{
                        ...(patientRx.find(p => p.id === expandedRx) || {}),
                        documents: rxDocs[expandedRx] || []
                    }}
                    patientName={selectedPatient?.patient?.full_name}
                    messages={messages[expandedRx] || []}
                    currentUserId={profile?.id}
                    role="doctor"
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
