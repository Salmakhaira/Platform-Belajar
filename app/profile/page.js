'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function Profile() {
  const { user } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [profile, setProfile] = useState(null)
  const [universities, setUniversities] = useState([])
  const [majors1, setMajors1] = useState([])
  const [majors2, setMajors2] = useState([])
  const [majors3, setMajors3] = useState([])

  // Form state
  const [fullName, setFullName] = useState('')
  const [school, setSchool] = useState('')
  const [graduationYear, setGraduationYear] = useState('2026')
  const [choice1, setChoice1] = useState({ university: '', major: '' })
  const [choice2, setChoice2] = useState({ university: '', major: '' })
  const [choice3, setChoice3] = useState({ university: '', major: '' })

  useEffect(function() {
    if (!user) {
      router.push('/login')
      return
    }
    fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)

    // Fetch universities
    const { data: uniData } = await supabase
      .from('universities')
      .select('*')
      .order('name')
    setUniversities(uniData || [])

    // Fetch profile dengan join ke majors dan universities
    const { data: profileData } = await supabase
      .from('student_profiles')
      .select(`
        *,
        choice1:choice_1_major_id (
          id, name, passing_grade, faculty,
          universities (id, name, short_name)
        ),
        choice2:choice_2_major_id (
          id, name, passing_grade, faculty,
          universities (id, name, short_name)
        ),
        choice3:choice_3_major_id (
          id, name, passing_grade, faculty,
          universities (id, name, short_name)
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setFullName(profileData.full_name || '')
      setSchool(profileData.school || '')
      setGraduationYear(profileData.graduation_year?.toString() || '2026')

      // Set choice values untuk form edit
      if (profileData.choice1) {
        const uniId = profileData.choice1.universities?.id || ''
        setChoice1({ university: uniId, major: profileData.choice_1_major_id })
        if (uniId) fetchMajors(uniId, 1)
      }
      if (profileData.choice2) {
        const uniId = profileData.choice2.universities?.id || ''
        setChoice2({ university: uniId, major: profileData.choice_2_major_id })
        if (uniId) fetchMajors(uniId, 2)
      }
      if (profileData.choice3) {
        const uniId = profileData.choice3.universities?.id || ''
        setChoice3({ university: uniId, major: profileData.choice_3_major_id })
        if (uniId) fetchMajors(uniId, 3)
      }
    }

    setLoading(false)
  }

  async function fetchMajors(universityId, choiceNum) {
    const { data } = await supabase
      .from('majors')
      .select('*')
      .eq('university_id', universityId)
      .order('name')

    if (choiceNum === 1) setMajors1(data || [])
    if (choiceNum === 2) setMajors2(data || [])
    if (choiceNum === 3) setMajors3(data || [])
  }

  function handleUniversityChange(value, choiceNum) {
    if (choiceNum === 1) {
      setChoice1({ university: value, major: '' })
      if (value) fetchMajors(value, 1)
    }
    if (choiceNum === 2) {
      setChoice2({ university: value, major: '' })
      if (value) fetchMajors(value, 2)
    }
    if (choiceNum === 3) {
      setChoice3({ university: value, major: '' })
      if (value) fetchMajors(value, 3)
    }
  }

  async function handleSave() {
    if (!fullName || !school) {
      alert('Nama dan sekolah wajib diisi!')
      return
    }
    if (!choice1.major) {
      alert('Pilihan jurusan 1 wajib diisi!')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('student_profiles')
      .upsert({
        user_id: user.id,
        full_name: fullName,
        school: school,
        graduation_year: parseInt(graduationYear),
        choice_1_major_id: choice1.major || null,
        choice_2_major_id: choice2.major || null,
        choice_3_major_id: choice3.major || null,
        updated_at: new Date().toISOString()
      })

    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setEditMode(false)
    fetchData() // Refresh data
  }

  function getLevelInfo(level) {
    if (level === 'smart') return { label: 'Smart ⭐', color: 'bg-yellow-100 text-yellow-700' }
    if (level === 'high') return { label: 'High 🟢', color: 'bg-green-100 text-green-700' }
    if (level === 'medium') return { label: 'Medium 🟡', color: 'bg-blue-100 text-blue-700' }
    if (level === 'low') return { label: 'Low 🔴', color: 'bg-red-100 text-red-700' }
    return { label: 'Belum Pretest', color: 'bg-gray-100 text-gray-600' }
  }

  if (!user) return null

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const levelInfo = getLevelInfo(profile?.level)

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold">👤 Profil Saya</h1>
              <p className="text-gray-500 mt-1">{user.email}</p>
            </div>
            {!editMode ? (
              <button
                onClick={function() { setEditMode(true) }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
              >
                ✏️ Edit Profil
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={function() { setEditMode(false) }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : '💾 Simpan'}
                </button>
              </div>
            )}
          </div>

          {/* Level Badge */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Level Kamu</p>
                <span className={'px-4 py-2 rounded-full font-bold text-lg ' + levelInfo.color}>
                  {levelInfo.label}
                </span>
              </div>
              {!profile?.pretest_completed ? (
                <button
                  onClick={function() { router.push('/pretest') }}
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  🎯 Mulai Pretest
                </button>
              ) : (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Skor Pretest</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {profile?.pretest_score ? parseFloat(profile.pretest_score).toFixed(1) + '%' : '-'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Data Diri */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-5">📋 Data Diri</h2>

            {!editMode ? (
              <div className="space-y-4">
                <InfoRow label="Nama Lengkap" value={profile?.full_name || '-'} />
                <InfoRow label="Asal Sekolah" value={profile?.school || '-'} />
                <InfoRow label="Tahun Lulus" value={profile?.graduation_year || '-'} />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={function(e) { setFullName(e.target.value) }}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Asal Sekolah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={school}
                    onChange={function(e) { setSchool(e.target.value) }}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tahun Lulus
                  </label>
                  <select
                    value={graduationYear}
                    onChange={function(e) { setGraduationYear(e.target.value) }}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 outline-none"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Pilihan Jurusan */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-5">🎯 Pilihan Jurusan</h2>

            {!editMode ? (
              <div className="space-y-4">
                <ChoiceView
                  nomor="1"
                  badge="bg-blue-600"
                  major={profile?.choice1}
                />
                <ChoiceView
                  nomor="2"
                  badge="bg-purple-500"
                  major={profile?.choice2}
                />
                <ChoiceView
                  nomor="3"
                  badge="bg-green-500"
                  major={profile?.choice3}
                />
              </div>
            ) : (
              <div className="space-y-5">
                <ChoiceEdit
                  label="Pilihan 1"
                  badge="bg-blue-600"
                  required={true}
                  universities={universities}
                  majorList={majors1}
                  choice={choice1}
                  onUniversityChange={function(v) { handleUniversityChange(v, 1) }}
                  onMajorChange={function(v) { setChoice1({ ...choice1, major: v }) }}
                />
                <ChoiceEdit
                  label="Pilihan 2"
                  badge="bg-purple-500"
                  required={false}
                  universities={universities}
                  majorList={majors2}
                  choice={choice2}
                  onUniversityChange={function(v) { handleUniversityChange(v, 2) }}
                  onMajorChange={function(v) { setChoice2({ ...choice2, major: v }) }}
                />
                <ChoiceEdit
                  label="Pilihan 3"
                  badge="bg-green-500"
                  required={false}
                  universities={universities}
                  majorList={majors3}
                  choice={choice3}
                  onUniversityChange={function(v) { handleUniversityChange(v, 3) }}
                  onMajorChange={function(v) { setChoice3({ ...choice3, major: v }) }}
                />
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-400">
            <h2 className="text-lg font-bold text-red-600 mb-3">⚠️ Zona Bahaya</h2>
            <p className="text-gray-500 text-sm mb-4">
              Reset pretest akan menghapus data level dan skor pretestmu.
            </p>
            <button
              onClick={async function() {
                if (!confirm('Yakin ingin reset pretest? Data level akan hilang.')) return
                await supabase
                  .from('student_profiles')
                  .update({ pretest_completed: false, pretest_score: null, level: null })
                  .eq('user_id', user.id)
                alert('Pretest berhasil direset!')
                fetchData()
              }}
              className="px-5 py-2 border-2 border-red-400 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
            >
              Reset Pretest
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

function InfoRow(props) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100">
      <span className="text-gray-500 text-sm">{props.label}</span>
      <span className="font-medium text-gray-800">{props.value}</span>
    </div>
  )
}

function ChoiceView(props) {
  const major = props.major
  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
      <span className={'text-white text-xs font-bold px-3 py-1 rounded-full mt-1 ' + props.badge}>
        {props.nomor}
      </span>
      {major ? (
        <div>
          <p className="font-semibold text-gray-800">{major.name}</p>
          <p className="text-sm text-gray-500">{major.universities?.name} • {major.faculty}</p>
          <p className="text-sm text-blue-600 font-medium mt-1">
            Passing Grade: {major.passing_grade}%
          </p>
        </div>
      ) : (
        <p className="text-gray-400 italic">Belum dipilih</p>
      )}
    </div>
  )
}

function ChoiceEdit(props) {
  return (
    <div className="border-2 border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={'text-white text-xs font-bold px-3 py-1 rounded-full ' + props.badge}>
          {props.label}
        </span>
        {props.required ? (
          <span className="text-red-500 text-xs">* Wajib</span>
        ) : (
          <span className="text-gray-400 text-xs">Opsional</span>
        )}
      </div>
      <div className="space-y-3">
        <select
          value={props.choice.university}
          onChange={function(e) { props.onUniversityChange(e.target.value) }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none"
        >
          <option value="">-- Pilih Universitas --</option>
          {props.universities.map(function(u) {
            return <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>
          })}
        </select>
        {props.choice.university && (
          <select
            value={props.choice.major}
            onChange={function(e) { props.onMajorChange(e.target.value) }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none"
          >
            <option value="">-- Pilih Jurusan --</option>
            {props.majorList.map(function(m) {
              return (
                <option key={m.id} value={m.id}>
                  {m.name} - PG: {m.passing_grade}%
                </option>
              )
            })}
          </select>
        )}
      </div>
    </div>
  )
}