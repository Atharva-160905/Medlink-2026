/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  User,
  Activity,
  Edit2,
  Save,
  X,
  AlertCircle,
  Shield,
  FileText,
  Briefcase,
  MapPin,
  ArrowLeft,
  Copy,
  Check,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  HeartPulse,
  Phone,
  Camera,
  Upload,
  Trash2,
  Stethoscope,
  Loader2,
  Sparkles
} from 'lucide-react'
import Logo from '../components/Logo'

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
  const [copiedId, setCopiedId] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Form State
  const [formData, setFormData] = useState({})

  const doctorPresets = [
    { label: 'Dr. Owl', url: '/avatars/doctors/dr-owl.svg' },
    { label: 'Dr. Bear', url: '/avatars/doctors/dr-bear.svg' },
    { label: 'Dr. Fox', url: '/avatars/doctors/dr-fox.svg' },
    { label: 'Dr. Penguin', url: '/avatars/doctors/dr-penguin.svg' },
    { label: 'Dr. Koala', url: '/avatars/doctors/dr-koala.svg' },
  ]

  const patientPresets = [
    { label: 'Hippo', url: '/avatars/patients/hippo.svg' },
    { label: 'Giraffe', url: '/avatars/patients/giraffe.svg' },
    { label: 'Panda', url: '/avatars/patients/panda.svg' },
    { label: 'Bunny', url: '/avatars/patients/bunny.svg' },
    { label: 'Tiger', url: '/avatars/patients/tiger.svg' },
  ]

  useEffect(() => {
    fetchProfile()
  }, [id])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      // 1. Get Current User
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
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
          .or(
            `and(doctor_id.eq.${user.id},patient_id.eq.${targetId}),and(doctor_id.eq.${targetId},patient_id.eq.${user.id})`
          )
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
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyId = () => {
    if (!profile?.public_id) return
    navigator.clipboard.writeText(profile.public_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const cleanFileName = `${profile.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(cleanFileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(cleanFileName)

      setFormData((prev) => ({ ...prev, avatar_url: urlData.publicUrl }))
    } catch (err) {
      alert('Avatar upload failed: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    try {
      const updates = {
        updated_at: new Date(),
        full_name: formData.full_name?.trim() || profile.full_name,
        avatar_url: formData.avatar_url ?? profile.avatar_url,
        ...(profile.role === 'patient'
          ? {
              age: formData.age || null,
              sex: formData.sex || null,
              allergies: formData.allergies || null,
              medical_conditions: formData.medical_conditions || null,
              emergency_notes: formData.emergency_notes || null,
            }
          : {
              specialization: formData.specialization || null,
              hospital_name: formData.hospital_name || null,
            }),
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)

      if (error) throw error
      setProfile({ ...profile, ...updates })
      setEditing(false)
    } catch (err) {
      alert('Error saving profile: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading verified health profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md w-full">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
          <p className="text-xs sm:text-sm text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const isSelf = viewerId === profile.id
  const canView = isSelf || isLinked

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md w-full">
          <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Protected Patient Profile</h2>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            This profile is private. You must be an active, verified doctor linked with this patient to
            review their health background.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const activeAvatarUrl = editing ? formData.avatar_url : profile.avatar_url
  const presets = profile.role === 'doctor' ? doctorPresets : patientPresets

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <Logo size={28} showWordmark={true} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isSelf && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
            )}

            {editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(false)
                    setFormData(profile)
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Identity Card */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* High-Grade Avatar Presentation */}
            <div className="relative group flex-shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-200 shadow-sm ring-4 ring-slate-100 relative bg-slate-900 flex items-center justify-center">
                {activeAvatarUrl ? (
                  <img
                    src={activeAvatarUrl}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 flex items-center justify-center text-white text-3xl font-bold select-none">
                    {profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                  </div>
                )}

                {/* Role Glyphs Icon Badge at Bottom-Right */}
                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-xl shadow-md border border-slate-200">
                  {profile.role === 'doctor' ? (
                    <div className="w-5 h-5 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                      <Stethoscope className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload trigger button when in Edit Mode */}
              {editing && (
                <label
                  className="absolute inset-0 bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                  title="Upload New Photo"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white mb-1" />
                  ) : (
                    <Camera className="h-6 w-6 text-white mb-1" />
                  )}
                  <span className="text-[10px] font-semibold">Change Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {editing ? formData.full_name || profile.full_name : profile.full_name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  {profile.role === 'doctor' ? 'Verified Physician' : 'Verified Patient'}
                </span>
              </div>

              {/* Doctor Details */}
              {profile.role === 'doctor' && (
                <div className="space-y-1 text-xs sm:text-sm text-slate-600 mb-4">
                  <p className="flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    <span>{profile.specialization || 'General Practice'}</span>
                  </p>
                  <p className="flex items-center justify-center sm:justify-start gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{profile.hospital_name || 'Clinic not specified'}</span>
                  </p>
                </div>
              )}

              {/* Patient Key Metrics Bar */}
              {profile.role === 'patient' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                  {/* Public ID with 1-click copy */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl relative group">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Patient ID
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900">
                        {profile.public_id}
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="text-slate-400 hover:text-slate-800 p-0.5 cursor-pointer"
                        title="Copy Patient ID"
                      >
                        {copiedId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {copiedId && (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </div>

                  {/* Age */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Age
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900">
                      {profile.age ? `${profile.age} yrs` : 'Not specified'}
                    </span>
                  </div>

                  {/* Biological Sex */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Biological Sex
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 capitalize">
                      {profile.sex || 'Not specified'}
                    </span>
                  </div>

                  {/* Vault Records */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Vault Records
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900">
                      {stats.docCount || 0} files
                    </span>
                  </div>
                </div>
              )}

              {/* Doctor Key Metrics Bar */}
              {profile.role === 'doctor' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                  {/* Public Doctor ID with 1-click copy */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl relative group">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Doctor ID
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900">
                        {profile.public_id}
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="text-slate-400 hover:text-slate-800 p-0.5 cursor-pointer"
                        title="Copy Doctor ID"
                      >
                        {copiedId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {copiedId && (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </div>

                  {/* Specialization */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Specialization
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate block">
                      {profile.specialization || 'General Practice'}
                    </span>
                  </div>

                  {/* Patients Connected */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Linked Patients
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900">
                      {stats.patientCount || 0} active
                    </span>
                  </div>

                  {/* Affiliation */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Clinic / Hospital
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate block">
                      {profile.hospital_name || 'Independent'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Avatar Presets Selection Tray (Only visible in edit mode) */}
          {editing && (
            <div className="mt-5 pt-5 border-t border-slate-100 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Choose a Character Avatar or Upload Your Own Photo:
                </span>
                {formData.avatar_url && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, avatar_url: null }))}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer inline-flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Reset to Monogram</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 overflow-x-auto py-2 no-scrollbar">
                {/* Upload own photo button */}
                <label className="flex flex-col items-center justify-center w-14 h-18 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-2xl text-xs font-semibold text-slate-700 cursor-pointer flex-shrink-0 transition-all group">
                  <Upload className="h-4 w-4 text-slate-400 group-hover:text-slate-700 mb-1" />
                  <span className="text-[10px] text-slate-600">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>

                {/* Preset Options */}
                {presets.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, avatar_url: preset.url }))}
                    className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all p-0.5 bg-white ${
                        formData.avatar_url === preset.url
                          ? 'border-slate-900 ring-2 ring-slate-900/30 scale-105 shadow-sm'
                          : 'border-slate-200 hover:border-slate-400 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span
                      className={`text-[10px] font-semibold transition-colors ${
                        formData.avatar_url === preset.url
                          ? 'text-slate-900 font-bold'
                          : 'text-slate-500 group-hover:text-slate-700'
                      }`}
                    >
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Edit Basics Drawer for Patient (Including Name) */}
        {editing && profile.role === 'patient' && (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              Edit Personal Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Atharva Ghuge"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm font-medium transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Age
                </label>
                <input
                  type="number"
                  placeholder="e.g. 34"
                  value={formData.age || ''}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Biological Sex
                </label>
                <select
                  value={formData.sex || ''}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Edit Basics Drawer for Doctor (Including Name) */}
        {editing && profile.role === 'doctor' && (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              Edit Professional Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Doctor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. John Doe"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm font-medium transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Specialization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cardiologist, Internal Medicine"
                  value={formData.specialization || ''}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Hospital / Clinic Affiliation
                </label>
                <input
                  type="text"
                  placeholder="e.g. City General Hospital"
                  value={formData.hospital_name || ''}
                  onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors"
                />
              </div>
            </div>
          </section>
        )}

        {/* Patient Clinical History & Emergency Context */}
        {profile.role === 'patient' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Medical Context (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
                      <HeartPulse className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Medical History</h2>
                      <p className="text-xs text-slate-500">Self-reported clinical baseline</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                    Self-Reported
                  </span>
                </div>

                <div className="space-y-5">
                  {/* Known Allergies */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Known Allergies & Drug Sensitivities
                    </label>
                    {editing ? (
                      <textarea
                        rows={3}
                        placeholder="e.g. Penicillin, Peanuts, Sulfa drugs..."
                        value={formData.allergies || ''}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors resize-none"
                      />
                    ) : (
                      <div
                        className={`p-4 rounded-xl border ${
                          profile.allergies
                            ? 'bg-amber-50/50 border-amber-200/80 text-amber-900'
                            : 'bg-slate-50 border-slate-200/80 text-slate-500'
                        }`}
                      >
                        <p className="text-xs sm:text-sm font-medium leading-relaxed">
                          {profile.allergies || 'No known allergies reported.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Existing Conditions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Existing Medical Conditions & Diagnoses
                    </label>
                    {editing ? (
                      <textarea
                        rows={3}
                        placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma..."
                        value={formData.medical_conditions || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, medical_conditions: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors resize-none"
                      />
                    ) : (
                      <div
                        className={`p-4 rounded-xl border ${
                          profile.medical_conditions
                            ? 'bg-slate-50 border-slate-200 text-slate-900'
                            : 'bg-slate-50 border-slate-200/80 text-slate-500'
                        }`}
                      >
                        <p className="text-xs sm:text-sm font-medium leading-relaxed">
                          {profile.medical_conditions || 'No chronic conditions reported.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Notes */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Emergency Information</h2>
                    <p className="text-xs text-slate-500">Contact details and acute care instructions</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Emergency Contact & Care Instructions
                  </label>
                  {editing ? (
                    <textarea
                      rows={2}
                      placeholder="e.g. Jane Doe (Spouse): +1 555-0199 or Blood Type O+"
                      value={formData.emergency_notes || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_notes: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm transition-colors resize-none"
                    />
                  ) : (
                    <div
                      className={`p-4 rounded-xl border ${
                        profile.emergency_notes
                          ? 'bg-slate-50 border-slate-200 text-slate-900'
                          : 'bg-slate-50 border-slate-200/80 text-slate-500'
                      }`}
                    >
                      <p className="text-xs sm:text-sm font-medium leading-relaxed">
                        {profile.emergency_notes || 'No emergency contacts or instructions specified.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: System Info & Privacy Guardrail */}
            <div className="space-y-6">
              {/* System Metadata Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Account Summary</span>
                </h3>
                <ul className="space-y-3.5">
                  <li className="flex items-center justify-between text-xs sm:text-sm pb-2.5 border-b border-slate-100">
                    <span className="text-slate-500">Member Since</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(profile.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </li>
                  <li className="flex items-center justify-between text-xs sm:text-sm pb-2.5 border-b border-slate-100">
                    <span className="text-slate-500">Public MedLink ID</span>
                    <span className="font-mono font-semibold text-slate-900">{profile.public_id}</span>
                  </li>
                  <li className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">Reports Uploaded</span>
                    <span className="font-semibold text-slate-900">{stats.docCount || 0}</span>
                  </li>
                </ul>
              </div>

              {/* Clinical Privacy Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-2 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Patient Privacy & Guardrails</span>
                </div>
                <p>
                  Profile context is strictly self-reported by you and shared only with linked physicians
                  whom you explicitly connect with.
                </p>
                <p className="text-[11px] text-slate-500">
                  MedLink AI never hallucinates or auto-populates clinical fields without your direct
                  consent.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Professional Roster (When viewing a doctor profile) */}
        {profile.role === 'doctor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span>Clinical Credentials</span>
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Medical License ID
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {profile.medical_license_id || 'Declared License'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Verified Clinical ID
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span>Practice Stats</span>
              </h3>
              <ul className="space-y-3.5">
                <li className="flex items-center justify-between text-xs sm:text-sm pb-2.5 border-b border-slate-100">
                  <span className="text-slate-500">Patients Linked</span>
                  <span className="font-semibold text-slate-900">{stats.patientCount || 0}</span>
                </li>
                <li className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Doctor ID</span>
                  <span className="font-mono font-semibold text-slate-900">{profile.public_id}</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
