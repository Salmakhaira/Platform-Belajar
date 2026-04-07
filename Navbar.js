'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthContext'  // ← FIX INI
import { LogOut, User, Menu, X } from 'lucide-react'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="w-full px-4 md:px-6 lg:px-8 py-3">
        <div className="flex justify-between items-center w-full">
          <Link href="/" className="text-xl md:text-2xl font-bold hover:text-blue-200 shrink-0">
            🎓 AIRoadToPTN
          </Link>
          
          {user ? (
            <>
              <div className="hidden lg:flex gap-4 xl:gap-6 items-center">
                <Link href="/latihan" className="hover:text-blue-200 text-sm xl:text-base">📝 Latihan</Link>
                <Link href="/materi" className="hover:text-blue-200 text-sm xl:text-base">📚 Materi</Link>
                <Link href="/tryout" className="hover:text-blue-200 text-sm xl:text-base">🎯 Tryout</Link>
                <Link href="/progress" className="hover:text-blue-200 text-sm xl:text-base">📊 Progress</Link>
                <Link href="/growup" className="hover:text-blue-200 text-sm xl:text-base">🚀 Grow Up</Link>
                <Link href="/history" className="hover:text-blue-200 text-sm xl:text-base">📋 History</Link>

                <div className="flex items-center gap-3 border-l pl-4 xl:pl-6">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 hover:text-blue-200 transition-all"
                  >
                    <User size={18} />
                    <span className="text-xs xl:text-sm max-w-25 xl:max-w-none truncate">
                      {user.email}
                    </span>
                  </Link>
                  <button
                    onClick={signOut}
                    className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 flex items-center gap-2 text-sm"
                  >
                    <LogOut size={14} />
                    <span className="hidden xl:inline">Keluar</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </>
          ) : (
            <div className="flex gap-3 ml-auto">
              <Link 
                href="/login" 
                className="bg-white text-blue-600 px-3 py-2 md:px-4 md:py-2 rounded hover:bg-blue-50 text-sm md:text-base"
              >
                Masuk
              </Link>
              <Link 
                href="/register" 
                className="border px-3 py-2 md:px-4 md:py-2 rounded hover:bg-blue-700 text-sm md:text-base"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>

        {user && mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 space-y-2">
            <Link 
              href="/latihan" 
              className="block py-2 px-4 hover:bg-blue-700 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              📝 Latihan
            </Link>
            <Link 
              href="/materi" 
              className="block py-2 px-4 hover:bg-blue-700 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              📚 Materi
            </Link>
            <Link 
              href="/tryout" 
              className="block py-2 px-4 hover:bg-blue-700 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              🎯 Tryout
            </Link>
            <Link 
              href="/progress" 
              className="block py-2 px-4 hover:bg-blue-700 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              📊 Progress
            </Link>
            <Link 
              href="/growup" 
              className="block py-2 px-4 hover:bg-blue-700 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              🚀 Grow Up
            </Link>
            <Link 
              href="/history" 
              className="block py-2 px-4 hover:bg-blue-700 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              📋 History
            </Link>
            
            <div className="border-t border-blue-500 pt-3 mt-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 py-2 px-4 hover:bg-blue-700 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={18} />
                <span className="text-sm truncate">{user.email}</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  signOut()
                }}
                className="w-full text-left flex items-center gap-2 py-2 px-4 hover:bg-red-600 rounded mt-2"
              >
                <LogOut size={18} />
                Keluar
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}