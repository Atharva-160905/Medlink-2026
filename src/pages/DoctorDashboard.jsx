import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FileText, Plus, UserPlus, LogOut, Search, User, File, ArrowLeft, Upload, Send, Trash2, MessageCircle } from 'lucide-react'
import MedicalChatbot from '../components/MedicalChatbot'


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
        if (!newRx.trim()) return

        try {
            // Create prescription
            const { data: rxData, error: rxError } = await supabase.from('prescriptions').insert({
                doctor_id: profile.id,
                patient_id: selectedPatient.patient.id,
                medication_text: newRx
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

    const loadMessages = async (rxId) => {
        const { data } = await supabase
            .from('prescription_messages')
            .select('*, sender:profiles!sender_id(full_name, role)')
            .eq('prescription_id', rxId)
            .order('created_at', { ascending: true })
        setMessages(prev => ({ ...prev, [rxId]: data || [] }))
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
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b border-indigo-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center">
                            <span className="text-xl font-bold text-indigo-600">MedLink Doctor</span>
                        </div>
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

                {selectedPatient ? (
                    // Patient Detail View
                    <div className="space-y-6">
                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="group flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 mb-6"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Patients
                        </button>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center space-x-4">
                                <div className="bg-indigo-100 p-3 rounded-full">
                                    <User className="h-8 w-8 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.patient.full_name}</h2>
                                    <p className="text-gray-500">ID: {selectedPatient.patient.public_id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Documents */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                                    <FileText className="h-5 w-5 mr-2 text-indigo-600" /> Patient Documents ({patientDocs.length})
                                </h3>
                                <div className="space-y-3">
                                    {patientDocs.map(doc => (
                                        <div key={doc.id} className="p-3 border rounded-lg hover:bg-gray-50 flex justify-between items-center group">
                                            <div className="flex items-center overflow-hidden">
                                                <File className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                                                <span className="truncate text-sm font-medium text-gray-700">{doc.filename}</span>
                                            </div>
                                            <a
                                                href="#"
                                                className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                    {patientDocs.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No documents shared.</p>}
                                </div>
                            </div>

                            {/* Prescriptions */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                                    <Plus className="h-5 w-5 mr-2 text-indigo-600" /> Prescriptions
                                </h3>

                                <div className="flex-1 space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                                    {patientRx.map(rx => (
                                        <div key={rx.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-xs text-gray-500">{new Date(rx.created_at).toLocaleDateString()}</p>
                                                <button
                                                    onClick={() => {
                                                        if (expandedRx === rx.id) {
                                                            setExpandedRx(null)
                                                        } else {
                                                            setExpandedRx(rx.id)
                                                            loadMessages(rx.id)
                                                        }
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-800 flex items-center text-xs"
                                                >
                                                    <MessageCircle className="h-3 w-3 mr-1" />
                                                    {expandedRx === rx.id ? 'Hide' : 'Chat'}
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">{rx.medication_text}</p>

                                            {/* Show attached documents */}
                                            {rxDocs[rx.id] && rxDocs[rx.id].length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                    <p className="text-xs font-semibold text-gray-600 mb-1">Attached:</p>
                                                    <div className="space-y-1">
                                                        {rxDocs[rx.id].map(doc => (
                                                            <div key={doc.id} className="flex items-center justify-between bg-white p-2 rounded text-xs">
                                                                <span className="text-gray-700">{doc.filename}</span>
                                                                <div className="flex gap-2">
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
                                                                        className="text-indigo-600 hover:text-indigo-800"
                                                                    >
                                                                        View
                                                                    </a>
                                                                    <button
                                                                        onClick={() => deletePrescriptionDoc(doc.id, doc.storage_path)}
                                                                        className="text-red-600 hover:text-red-800"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Messages section */}
                                            {expandedRx === rx.id && (
                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Messages:</h5>
                                                    <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                                                        {messages[rx.id] && messages[rx.id].length > 0 ? messages[rx.id].map(msg => (
                                                            <div key={msg.id} className={`p-2 rounded text-xs ${msg.sender.role === 'doctor' ? 'bg-indigo-100 text-right' : 'bg-gray-100'}`}>
                                                                <p className="font-medium text-xs text-gray-600">{msg.sender.full_name}</p>
                                                                <p>{msg.message_text}</p>
                                                            </div>
                                                        )) : <p className="text-gray-500 text-xs text-center py-2">No messages yet</p>}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Type a message..."
                                                            className="flex-1 px-2 py-1 border rounded text-xs"
                                                            value={newMessage}
                                                            onChange={(e) => setNewMessage(e.target.value)}
                                                            onKeyPress={(e) => e.key === 'Enter' && sendMessage(rx.id)}
                                                        />
                                                        <button
                                                            onClick={() => sendMessage(rx.id)}
                                                            className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                                                        >
                                                            <Send className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {patientRx.length === 0 && <p className="text-gray-400 text-sm text-center">No prescriptions history.</p>}
                                </div>

                                <form onSubmit={handleAddRx} className="mt-auto border-t pt-4">
                                    <textarea
                                        placeholder="Write a new prescription..."
                                        className="w-full p-3 border rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                                        value={newRx}
                                        onChange={(e) => setNewRx(e.target.value)}
                                    />

                                    {/* File Upload */}
                                    <div className="mt-3">
                                        <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                            <Upload className="h-4 w-4 mr-2 text-gray-500" />
                                            <span className="text-sm text-gray-600">
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
                                        className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                                    >
                                        Add Prescription
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                ) : (
                    // Patient List View
                    <div className="space-y-6">

                        {/* Add Patient */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Connect Patient</h3>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Enter Patient Public ID"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={patientIdInput}
                                    onChange={(e) => setPatientIdInput(e.target.value)}
                                />
                                <button
                                    onClick={addPatient}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center"
                                >
                                    <UserPlus className="h-4 w-4 mr-2" /> Send Request
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Patients</h3>
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
                                        className={`bg-white p-6 rounded-xl border transition-all ${link.status === 'active'
                                            ? 'cursor-pointer hover:shadow-md border-gray-100 hover:border-indigo-200'
                                            : 'opacity-75 border-dashed border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center">
                                                <div className="bg-indigo-50 p-2 rounded-full mr-3">
                                                    <User className="h-6 w-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{link.patient.full_name}</h4>
                                                    <p className="text-sm text-gray-500">{link.status === 'active' ? 'Active' : 'Pending Request'}</p>
                                                </div>
                                            </div>
                                            {link.status === 'active' && <FileText className="h-5 w-5 text-gray-300" />}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-gray-500 col-span-3 text-center py-10">No patients connected yet.</p>
                                )}
                            </div>
                        </div>

                    </div>
                )}

            </main>
            <MedicalChatbot />
        </div>

    )
}
