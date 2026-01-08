/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { User, Activity, Edit2, Save, X, AlertCircle, Shield, FileText, Briefcase, MapPin } from 'lucide-react'

export default function ProfilePage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [viewerId, setViewerId] = useState(null)
    const [viewerRole, setViewerRole] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [error, setError] = useState(null)
    const [isLinked, setIsLinked] = useState(false)
    const [stats, setStats] = useState({})

    // Form State
    const [formData, setFormData] = useState({})

    useEffect(() => {
        fetchProfile()
    }, [id])

    const fetchProfile = async () => {
        setLoading(true)
        try {
            // 1. Get Current User
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")
            setViewerId(user.id)

            // 2. Get Viewer Role
            const { data: viewerProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            setViewerRole(viewerProfile?.role)

            // 3. Determine Target Profile ID
            const targetId = id || user.id
            const isSelf = targetId === user.id

            // 4. Check Linkage if seeing someone else
            let linked = false
            if (!isSelf) {
                const { data: linkData } = await supabase
                    .from('doctor_patient_links')
                    .select('status')
                    .or(`and(doctor_id.eq.${user.id},patient_id.eq.${targetId}),and(doctor_id.eq.${targetId},patient_id.eq.${user.id})`)
                    .single()

                if (linkData?.status === 'active') {
                    linked = true
                }
                setIsLinked(linked)
            }

            // 5. Fetch Target Profile Data
            const { data: targetProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', targetId)
                .single()

            if (profileError) throw profileError
            setProfile(targetProfile)
            setFormData(targetProfile)

            // 6. Fetch / Calculate Stats
            let fetchedStats = {}
            if (targetProfile.role === 'patient') {
                const { count } = await supabase
                    .from('documents')
                    .select('*', { count: 'exact', head: true })
                    .eq('patient_id', targetId)
                fetchedStats.docCount = count || 0
            } else {
                const { count } = await supabase
                    .from('doctor_patient_links')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', targetId)
                    .eq('status', 'active')
                fetchedStats.patientCount = count || 0
            }
            setStats(fetchedStats)
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            const updates = {
                updated_at: new Date(),
                // Allowed fields depending on role
                ...(profile.role === 'patient' ? {
                    age: formData.age,
                    sex: formData.sex,
                    allergies: formData.allergies,
                    medical_conditions: formData.medical_conditions,
                    emergency_notes: formData.emergency_notes
                } : {
                    specialization: formData.specialization,
                    hospital_name: formData.hospital_name
                })
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id)

            if (error) throw error
            setProfile({ ...profile, ...updates })
            setEditing(false)
        } catch (err) {
            alert("Error saving profile: " + err.message)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-medium">Go Home</button>
            </div>
        </div>
    )

    const isSelf = viewerId === profile.id
    const canView = isSelf || isLinked
    // If not self and not linked, show minimal info or blockage? 
    // Requirement says: "Unlinked users: No access".
    // However, existing simple RLS is open. We will enforce visual block here.
    if (!canView) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
            <div className="text-center p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 max-w-md">
                <Shield className="h-16 w-16 text-slate-300 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Private Profile</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    This profile is protected. You must be linked to this user to view their full details.
                </p>
                <button onClick={() => navigate(-1)} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all">
                    Go Back
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 font-sans">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header / Nav */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-900 font-medium transition-colors">
                        <X className="h-5 w-5 mr-2" /> Close
                    </button>
                    {isSelf && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95 font-semibold"
                        >
                            <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
                        </button>
                    )}
                    {editing && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setEditing(false); setFormData(profile); }}
                                className="px-5 py-2.5 text-slate-600 hover:bg-white/50 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center px-6 py-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:bg-green-700 transition-all active:scale-95 font-bold"
                            >
                                <Save className="h-4 w-4 mr-2" /> Save Changes
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Header Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-white/60 mb-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:scale-110 duration-700" />

                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center shadow-inner border-4 border-white">
                            <User className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400" />
                        </div>
                        <div className="text-center md:text-left flex-1">
                            <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{profile.full_name}</h1>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${profile.role === 'doctor' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                    {profile.role}
                                </span>
                            </div>

                            {profile.role === 'doctor' && (
                                <div className="space-y-1 mt-2">
                                    <p className="text-lg text-slate-600 font-medium flex items-center justify-center md:justify-start">
                                        <Briefcase className="h-4 w-4 mr-2" />
                                        {profile.specialization || "Specialization not added"}
                                    </p>
                                    <p className="text-slate-500 flex items-center justify-center md:justify-start">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        {profile.hospital_name || "Hospital not listed"}
                                    </p>
                                </div>
                            )}

                            {profile.role === 'patient' && (
                                <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-4">
                                    <div className="px-4 py-2 bg-white/50 rounded-xl border border-slate-200/50 backdrop-blur-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">ID</span>
                                        <span className="font-mono font-medium text-slate-700">{profile.public_id}</span>
                                    </div>
                                    <div className="px-4 py-2 bg-white/50 rounded-xl border border-slate-200/50 backdrop-blur-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Age</span>
                                        <span className="font-semibold text-slate-900">{profile.age || "--"}</span>
                                    </div>
                                    <div className="px-4 py-2 bg-white/50 rounded-xl border border-slate-200/50 backdrop-blur-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Sex</span>
                                        <span className="font-semibold text-slate-900 capitalize">{profile.sex || "--"}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column (Patient Medical Info / Doctor Details) */}
                    <div className="lg:col-span-2 space-y-8">

                        {profile.role === 'patient' && (
                            <>
                                <Section title="Medical Context" icon={Activity} badge="Self-Reported">
                                    <div className="grid gap-6">
                                        <Field
                                            label="Known Allergies"
                                            value={formData.allergies}
                                            isEditing={editing}
                                            onChange={(val) => setFormData({ ...formData, allergies: val })}
                                            type="textarea"
                                            placeholder="e.g. Penicillin, Peanuts..."
                                        />
                                        <Field
                                            label="Existing Medical Conditions"
                                            value={formData.medical_conditions}
                                            isEditing={editing}
                                            onChange={(val) => setFormData({ ...formData, medical_conditions: val })}
                                            type="textarea"
                                            placeholder="e.g. Type 2 Diabetes, Hypertension..."
                                        />
                                    </div>
                                </Section>

                                <Section title="Emergency Information" icon={AlertCircle} color="red">
                                    <Field
                                        label="Emergency Notes / Contacts"
                                        value={formData.emergency_notes}
                                        isEditing={editing}
                                        onChange={(val) => setFormData({ ...formData, emergency_notes: val })}
                                        type="textarea"
                                        placeholder="Emergency contact name and number..."
                                    />
                                </Section>
                            </>
                        )}

                        {profile.role === 'doctor' && (
                            <Section title="Professional Details" icon={Briefcase}>
                                <div className="grid gap-6">
                                    <Field
                                        label="Specialization"
                                        value={formData.specialization}
                                        isEditing={editing}
                                        onChange={(val) => setFormData({ ...formData, specialization: val })}
                                        placeholder="e.g. Cardiologist"
                                    />
                                    <Field
                                        label="Hospital / Clinic Name"
                                        value={formData.hospital_name}
                                        isEditing={editing}
                                        onChange={(val) => setFormData({ ...formData, hospital_name: val })}
                                        placeholder="e.g. City General Hospital"
                                    />
                                    <Field
                                        label="Medical Registration / License ID"
                                        value={profile.medical_license_id}
                                        isEditing={false} // READ ONLY
                                        placeholder="Licence ID"
                                        readOnlyBadge
                                    />
                                </div>
                            </Section>
                        )}

                        {/* Safety Disclaimer */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 items-start">
                            <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-bold text-blue-900 mb-1">Medical Safety Notice</h4>
                                <p className="text-sm text-blue-800/80 leading-relaxed">
                                    This profile information is for reference only.
                                    {profile.role === 'patient'
                                        ? " Medical details are self-reported by the patient and have not been expertly verified."
                                        : " Professional details are self-declared."}
                                    <br />
                                    <span className="font-semibold block mt-1">AI summaries are never used to populate this profile.</span>
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Meta / Actions) */}
                    <div className="space-y-6">
                        {/* Edit Basics (Only visible to Self in Edit Mode) */}
                        {editing && profile.role === 'patient' && (
                            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Edit Basics</h3>
                                <div className="space-y-4">
                                    <Field
                                        label="Age"
                                        value={formData.age}
                                        isEditing={true}
                                        onChange={(val) => setFormData({ ...formData, age: val })}
                                        type="number"
                                    />
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sex</label>
                                        <select
                                            value={formData.sex || ''}
                                            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        >
                                            <option value="">Select...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide flex items-center">
                                <Activity className="h-4 w-4 mr-2" /> System Info
                            </h3>
                            <ul className="space-y-4">
                                <li className="flex justify-between text-sm">
                                    <span className="text-slate-500">Member Since</span>
                                    <span className="font-medium text-slate-900">{new Date(profile.created_at).toLocaleDateString()}</span>
                                </li>
                                <li className="flex justify-between text-sm">
                                    <span className="text-slate-500">Public ID</span>
                                    <span className="font-mono font-medium text-slate-900">{profile.public_id}</span>
                                </li>
                                {profile.role === 'patient' && (
                                    <li className="flex justify-between text-sm">
                                        <span className="text-slate-500">Reports Uploaded</span>
                                        <span className="font-medium text-slate-900">{stats.docCount || 0}</span>
                                    </li>
                                )}
                                {profile.role === 'doctor' && (
                                    <li className="flex justify-between text-sm">
                                        <span className="text-slate-500">Patients Treated</span>
                                        <span className="font-medium text-slate-900">{stats.patientCount || 0}</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

function Section({ title, icon: Icon, children, badge, color = 'indigo' }) {
    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-white/60">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 flex items-center">
                    {Icon && <Icon className={`h-6 w-6 mr-3 text-${color}-600`} />}
                    {title}
                </h3>
                {badge && <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">{badge}</span>}
            </div>
            {children}
        </div>
    )
}

function Field({ label, value, isEditing, onChange, type = "text", placeholder, readOnlyBadge }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">{label}</label>
                {readOnlyBadge && <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">Read Only</span>}
            </div>
            {isEditing && !readOnlyBadge ? (
                type === "textarea" ? (
                    <textarea
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[100px]"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                    />
                ) : (
                    <input
                        type={type}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                    />
                )
            ) : (
                <div className={`p-4 rounded-xl border ${value ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/50 border-dashed border-slate-200'}`}>
                    {value ? (
                        <p className="text-slate-800 whitespace-pre-wrap">{value}</p>
                    ) : (
                        <p className="text-slate-400 italic text-sm">Not specified</p>
                    )}
                </div>
            )}
        </div>
    )
}
