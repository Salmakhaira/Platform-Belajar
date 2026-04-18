'use client'
import { useState, useEffect, useRef } from 'react'
import { Clock, AlertCircle } from 'lucide-react'

export default function Timer({ durationMinutes, onTimeUp, isActive }) {
  const [timeLeft, setTimeLeft] = useState((durationMinutes || 120) * 60)
  const onTimeUpRef = useRef(onTimeUp)
  const timerRef = useRef(null)

  useEffect(() => {
    onTimeUpRef.current = onTimeUp
  })

  useEffect(() => {
    if (durationMinutes && durationMinutes > 0) {
      setTimeLeft(durationMinutes * 60)
    }
  }, [durationMinutes])

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (!isActive) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          timerRef.current = null
          setTimeout(() => onTimeUpRef.current?.(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isActive])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isWarning = timeLeft > 0 && timeLeft < 300

  return (
    <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg font-bold text-lg z-50 ${
      isWarning ? 'bg-red-500 animate-pulse' : 'bg-blue-600'
    } text-white`}>
      <div className="flex items-center gap-2">
        {isWarning ? <AlertCircle size={24} /> : <Clock size={24} />}
        <span>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
      {isWarning && <p className="text-xs mt-1">Segera selesaikan!</p>}
      {timeLeft === 0 && <p className="text-xs mt-1">Waktu habis!</p>}
    </div>
  )
}
