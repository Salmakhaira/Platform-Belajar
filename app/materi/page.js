'use client'
import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

const MATERI_DATA = [
  {
    code: 'PU', name: 'Penalaran Umum', emoji: '🧠',
    links: [
      { title: 'PU - Simpulan Logis', url: 'https://docs.google.com/document/d/10e9tdwPo5jTK_Q3fdXvnsAm3ktkZNxo3/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PU - Sebab Akibat', url: 'https://docs.google.com/document/d/1CXcrnTWMnjuUWtv2tOZOH6TPhrOV0AM5/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PU - Penalaran Analitik', url: 'https://docs.google.com/document/d/1xijjPAmOstz80bUPMLEi4x2tSkZJpLLk/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PU - Kesesuaian Pernyataan', url: 'https://docs.google.com/document/d/18XaYrEmX6T8engm3lgWErm4HhBsICj88/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PU - Operasi Aritmatika Dasar', url: 'https://docs.google.com/document/d/1-Nt2mtCKCKkVHJ4HnyrA6NN4pMTsjJLI/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PU - Hubungan Matematika Sederhana & Kuantitas', url: 'https://docs.google.com/document/d/18zy53mz8J00ty4SfhknrQGcDg0xLeYGB/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' }
    ]
  },
  {
    code: 'PPU', name: 'Pengetahuan & Pemahaman Umum', emoji: '📖',
    links: [
      { title: 'PPU - Bentuk Kata Imbuhan & Kolokasi', url: 'https://docs.google.com/document/d/1IMoXooqoN32DrTQMQYNQAQsQsmUIcoMT/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PPU - Hubungan Antar Paragraf dan Antar Kalimat', url: 'https://docs.google.com/document/d/1sONvjrmdqa6gyegbPj_EapFHi2pt2n9Y/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PPU - Kesesuaian Wacana Pola & Perbaikan Kalimat', url: 'https://docs.google.com/document/d/1BS5XJr9RrbFg9fQax1v6Qf_j7Iu6LnZe/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PPU - Ide Pokok & Simpulan Teks', url: 'https://docs.google.com/document/d/1e-Dq4fF2q_keQ18yKrW3djsgd6jzpiD4/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PPU - Makna Kata Sinonim Antonim Homonim', url: 'https://docs.google.com/document/d/1ls-y8ZzRcuT7wUCRTpbEC-bepb8ejVzs/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
    ]
  },
  {
    code: 'PBM', name: 'Pemahaman Bacaan & Menulis', emoji: '✍️',
    links: [
      { title: 'PBM - Bentuk Kata', url: 'https://docs.google.com/document/d/14Sxp2AgrMKIArkZTHvjgRGhrAm8D4IUR/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PBM - Ejaan Konjungsi', url: 'https://docs.google.com/document/d/18kEttnIk9GQFnpqp0uf9AGnkHD-PrF-6/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PBM - Ide Pokok', url: 'https://docs.google.com/document/d/1KAaLVxAlzGKh19Ka4ZX0fVtIg2_yQKSV/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PBM - Kalimat Efektif', url: 'https://docs.google.com/document/d/1gC9kycZORYnIRBB3pB5npRNpRQisFlC1/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PBM - Kepaduan Wacana', url: 'https://docs.google.com/document/d/1HR4mQf9xRSMeirqf9H8rEcvAmq_9MOvt/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PBM - Makna Kata', url: 'https://docs.google.com/document/d/1jIL3SjQTYtNF9gSZzizn_75F3PbSKfrn/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' }
    ]
  },
  {
    code: 'PK', name: 'Pengetahuan Kuantitatif', emoji: '🔢',
    links: [
      { title: 'PK - Aljabar & Fungsi', url: 'https://docs.google.com/document/d/1bE3w-6J1xKcITy7l34U2eodJIUDIUKXL/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PK - Bilangan', url: 'https://docs.google.com/document/d/1QuZ6i8M2gQLEuj7BmaB9Oa9y7vgg6tLw/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PK - Geometri', url: 'https://docs.google.com/document/d/10drRNhVOb7WrwbEN_BV4rEebc9Q9MnDL/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PK - Statistika & Peluang', url: 'https://docs.google.com/document/d/1vrUOzy5M-fef1Brj6qYEm5XCkgKG7o-_/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' }
    ]
  },
  {
    code: 'LBI', name: 'Literasi Bahasa Indonesia', emoji: '🇮🇩',
    links: [
      { title: 'LBI - Bacaan Argumentatif', url: 'https://docs.google.com/document/d/1Lb0vPh3bsIIeiFvF6hlK0w3kZK3zcPy8/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Bacaan Ulasan', url: 'https://docs.google.com/document/d/1SRxMNjlkKgJN2AE-g4I7YgZugrOzJ0rO/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Makna Kontekstual Kata', url: 'https://docs.google.com/document/d/1yp-T8zDL2PeJmsW872Vz9DenkJKi-s5k/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Makna Teks Umum', url: 'https://docs.google.com/document/d/1KBmVp7gaRXVnOYbs5xTm0ikjvfihQky8/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Menentukan Inti Bacaan', url: 'https://docs.google.com/document/d/1uEph1RXWhFksLBY0ylJD-5NeLlt-ixv0/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Menyimpulkan Isi Bacaan', url: 'https://docs.google.com/document/d/1f8yftIw_pdL1L27Vc5XbkRkFFpAEzEEb/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Sebab-Akibat Bacaan Eksplanatif', url: 'https://docs.google.com/document/d/1T9GXS8JHx29upTFgx2Ui9EacNIHFtj0w/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Teks Personal Inspiratif', url: 'https://docs.google.com/document/d/1fbCkm8mwzScnNXfXCo_DyG4K1tUBe5yY/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Tema dalam Teks Sastra', url: 'https://docs.google.com/document/d/1keW2Aw4quA_5oEM7hZudYWoHpc9zV2am/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Evaluasi dan Apresiasi', url: 'https://docs.google.com/document/d/18pljBQAc_2vy3otx5i2ELsUY01WYvXG5/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Pemahaman Inferensial', url: 'https://docs.google.com/document/d/1P2tI7I4sf_lldBEvjxnHJ2-KtnvGpxtu/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBI - Pemahaman Tekstual', url: 'https://docs.google.com/document/d/1kr2_K87-VeTGjiySh2fXSoUBQ1h3YldR/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' }
    ]
  },
  {
    code: 'LBE', name: 'Literasi Bahasa Inggris', emoji: '🇬🇧',
    links: [
      { title: 'LBE - Evaluation and Appreciation', url: 'https://docs.google.com/document/d/1zQQ7j5QP-E6o0UMhU-XtyJOGQAfFXrYX/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBE - Inferential Understanding', url: 'https://docs.google.com/document/d/1WWRfTDAYK4stNCop6NrIpbQjRIldEHk6/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'LBE - Textual Understanding', url: 'https://docs.google.com/document/d/13XRkim9AG-bjO2bH2jn8KDvQTJI_5ZR3/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' }
    ]
  },
  {
    code: 'PM', name: 'Penalaran Matematika', emoji: '➗',
    links: [
      { title: 'PM - Aljabar & Fungsi', url: 'https://docs.google.com/document/d/1wLsVHnT7BUmUOaelUYZLsbIFVsfHJd9j/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Aritmetika Sosial', url: 'https://docs.google.com/document/d/1LCghx7J52myF0pmBDBTgGT0_MaEoEk4k/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Aturan Pencacahan', url: 'https://docs.google.com/document/d/1ITgu7CpRuJuFWLUqlHw2R4K_8IWfTvmz/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Bangun Datar', url: 'https://docs.google.com/document/d/1NqgFgJzPNDu_q7zE09Btds2i3W5LL5hu/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Bangun Ruang', url: 'https://docs.google.com/document/d/1ZZb2K7OLbrXTKsCqj60Eyp5ItpP2MIN_/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Bentuk Aljabar', url: 'https://docs.google.com/document/d/1cuwhDRFxvjD-vhJqfnV-qc0fM6vuX5GS/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Bilangan (Representasi, Sifat Urutan, Operasi Hitung)', url: 'https://docs.google.com/document/d/1SPRnwatC9_VeRkVKiC-Qtkq84EulYAjy/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Data dan Ketidakpastian', url: 'https://docs.google.com/document/d/1hUeNrliGXCQaKbScQzkZ-uG1eOopVICH/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Fungsi & Persamaan Garis Lurus', url: 'https://docs.google.com/document/d/1ikEY6-VwuivFn4TpKEP2h7ZmfwemquAg/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Himpunan', url: 'https://docs.google.com/document/d/11FzPwz4iOyBO2WH6bKbMy0_535ME5q3O/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Pengukuran & Geometri', url: 'https://docs.google.com/document/d/1SQxaPBXcCxQ4dgYnF4PMBNdMD6dhinin/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Perbandingan & Rasio', url: 'https://docs.google.com/document/d/1uMWdh3WPbHoYgEEPqJIuv-xRqmfCp_4F/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Persamaan dan Pertidaksamaan', url: 'https://docs.google.com/document/d/1EFatLx9_bw757tMo0Ic2IQOOAmxIr5SW/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Pola Bilangan', url: 'https://docs.google.com/document/d/1HfztbFNEjsQN6fa-QznmX07z4CkEZfkk/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Statistika Deskriptif', url: 'https://docs.google.com/document/d/1HSaxzJDsZ92DAbeF0kttYXZhkirnsD68/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' },
      { title: 'PM - Rangkuman Lengkap PM', url: 'https://docs.google.com/document/d/1awzqt8teAAPrIP3MRL6gZk8FjVB_uK3y/edit?usp=sharing&ouid=107866639140880431027&rtpof=true&sd=true' }
    ]
  }
]

function VideoLink(props) {
  return (
    <a
      href={props.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all mb-2"
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-blue-700">
          {props.nomor}
        </span>
        <span className="text-sm font-medium text-blue-700">{props.judul}</span>
      </div>
      <span className="text-blue-500 text-sm">↗</span>
    </a>
  )
}

function MateriCard(props) {
  const [isOpen, setIsOpen] = useState(false)
  const data = props.data
  const links = data.links

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 hover:border-blue-300 transition-all">
      <button
        onClick={function() { setIsOpen(!isOpen) }}
        className="w-full p-6 text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{data.emoji}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                  {data.code}
                </span>
                <span className="text-xs text-gray-500">{links.length} video</span>
              </div>
              <p className="text-gray-700 font-medium">{data.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500">▶</span>
            <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {isOpen ? (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500 mb-3">Daftar video pembelajaran:</p>
          <VideoLink nomor={1} judul={links[0].title} url={links[0].url} />
          {links[1] ? <VideoLink nomor={2} judul={links[1].title} url={links[1].url} /> : null}
          {links[2] ? <VideoLink nomor={3} judul={links[2].title} url={links[2].url} /> : null}
          {links[3] ? <VideoLink nomor={4} judul={links[3].title} url={links[3].url} /> : null}
          {links[4] ? <VideoLink nomor={5} judul={links[4].title} url={links[4].url} /> : null}
          {links[5] ? <VideoLink nomor={6} judul={links[5].title} url={links[5].url} /> : null}
          {links[6] ? <VideoLink nomor={7} judul={links[6].title} url={links[6].url} /> : null}
          {links[7] ? <VideoLink nomor={8} judul={links[7].title} url={links[7].url} /> : null}
          {links[8] ? <VideoLink nomor={9} judul={links[8].title} url={links[8].url} /> : null}
          {links[9] ? <VideoLink nomor={10} judul={links[9].title} url={links[9].url} /> : null}
          {links[10] ? <VideoLink nomor={11} judul={links[10].title} url={links[10].url} /> : null}
          {links[11] ? <VideoLink nomor={12} judul={links[11].title} url={links[11].url} /> : null}
          {links[12] ? <VideoLink nomor={13} judul={links[12].title} url={links[12].url} /> : null}
          {links[13] ? <VideoLink nomor={14} judul={links[13].title} url={links[13].url} /> : null}
          {links[14] ? <VideoLink nomor={15} judul={links[14].title} url={links[14].url} /> : null}
          {links[15] ? <VideoLink nomor={16} judul={links[15].title} url={links[15].url} /> : null}
          {links[16] ? <VideoLink nomor={17} judul={links[16].title} url={links[16].url} /> : null}
          {links[17] ? <VideoLink nomor={18} judul={links[17].title} url={links[17].url} /> : null}
          {links[18] ? <VideoLink nomor={19} judul={links[18].title} url={links[18].url} /> : null}
          {links[19] ? <VideoLink nomor={20} judul={links[19].title} url={links[19].url} /> : null}
          {links[20] ? <VideoLink nomor={21} judul={links[20].title} url={links[20].url} /> : null}
        </div>
      ) : null}
    </div>
  )
}

export default function Materi() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(function() {
    if (!user) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">📚 Materi Pembelajaran</h1>
            <p className="text-gray-600">Klik submateri untuk melihat daftar video pembelajaran</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MateriCard data={MATERI_DATA[0]} />
            <MateriCard data={MATERI_DATA[1]} />
            <MateriCard data={MATERI_DATA[2]} />
            <MateriCard data={MATERI_DATA[3]} />
            <MateriCard data={MATERI_DATA[4]} />
            <MateriCard data={MATERI_DATA[5]} />
            <MateriCard data={MATERI_DATA[6]} />
          </div>

          <div className="mt-10 bg-white border-l-4 border-blue-500 p-6 rounded-lg shadow">
            <h3 className="font-bold text-lg mb-3">💡 Tips Belajar Efektif</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700 text-sm">
              <p>✅ Tonton video secara berurutan dari video 1</p>
              <p>✅ Buat catatan poin-poin penting</p>
              <p>✅ Pause dan coba kerjakan sendiri dulu</p>
              <p>✅ Ulangi video yang belum dipahami</p>
              <p>✅ Langsung latihan soal setelah nonton</p>
              <p>✅ Istirahat setiap 45-60 menit belajar</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}