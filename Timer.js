'use client'
import { useState, useEffect } from 'react'
import { Clock, AlertCircle } from 'lucide-react'

export default function Timer({ durationMinutes, onTimeUp, isActive }) {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60)

  useEffect(() => {
    if (!isActive) return

    if (timeLeft <= 0) {
      onTimeUp()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isActive, onTimeUp])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isWarning = timeLeft < 300 // < 5 menit

  return (
    <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg font-bold text-lg z-50 ${
      isWarning ? 'bg-red-500 animate-pulse' : 'bg-blue-600'
    } text-white`}>
      <div className="flex items-center gap-2">
        {isWarning ? <AlertCircle size={24} /> : <Clock size={24} />}
        <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
      </div>
      {isWarning && <p className="text-xs mt-1">Segera selesaikan!</p>}
    </div>
  )
}