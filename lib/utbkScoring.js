/**
 * UTBK IRT-Based Scoring System
 * No penalty for wrong answers, difficulty-weighted scoring
 */

/**
 * Calculate IRT-based score for UTBK tryout
 * @param {Array} questions - Array of question objects
 * @param {Object} answers - Object mapping question_id to {answer, timeTaken}
 * @returns {Object} Score result with normalized score (0-1000)
 */
export function calculateIRTScore(questions, answers) {
  let rawScore = 0
  let maxPossibleScore = 0
  let correct = 0
  let wrong = 0
  let unanswered = 0

  // Difficulty weights
  const weights = {
    easy: 1,
    medium: 2,
    hard: 3
  }

  questions.forEach(q => {
    const difficulty = q.difficulty || 'medium'
    const weight = weights[difficulty] || 2
    maxPossibleScore += weight

    const userAnswer = answers[q.id]?.answer
    
    if (!userAnswer) {
      // Unanswered: 0 points
      unanswered++
    } else if (userAnswer === q.correct_answer) {
      // Correct: award points based on difficulty
      rawScore += weight
      correct++
    } else {
      // Wrong: 0 points (NO PENALTY)
      wrong++
    }
  })

  // Normalize to 0-1000 scale
  const normalizedScore = maxPossibleScore > 0 
    ? Math.round((rawScore / maxPossibleScore) * 1000)
    : 0

  const percentage = questions.length > 0
    ? Math.round((correct / questions.length) * 100)
    : 0

  return {
    rawScore,
    maxPossibleScore,
    normalizedScore,
    correct,
    wrong,
    unanswered,
    percentage
  }
}

/**
 * Calculate scores per submateri
 * @param {Array} questions - Array of question objects
 * @param {Object} answers - Object mapping question_id to {answer, timeTaken}
 * @returns {Object} Scores grouped by submateri
 */
export function calculatePerSubmateri(questions, answers) {
  const submateriScores = {}

  const weights = {
    easy: 1,
    medium: 2,
    hard: 3
  }

  questions.forEach(q => {
    const sub = q.submateri
    if (!sub) return

    if (!submateriScores[sub]) {
      submateriScores[sub] = {
        rawScore: 0,
        maxPossibleScore: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        total: 0
      }
    }

    const difficulty = q.difficulty || 'medium'
    const weight = weights[difficulty] || 2
    submateriScores[sub].maxPossibleScore += weight
    submateriScores[sub].total++

    const userAnswer = answers[q.id]?.answer
    
    if (!userAnswer) {
      submateriScores[sub].unanswered++
    } else if (userAnswer === q.correct_answer) {
      submateriScores[sub].rawScore += weight
      submateriScores[sub].correct++
    } else {
      submateriScores[sub].wrong++
    }
  })

  // Calculate normalized scores and percentages
  Object.keys(submateriScores).forEach(sub => {
    const data = submateriScores[sub]
    data.normalizedScore = data.maxPossibleScore > 0
      ? Math.round((data.rawScore / data.maxPossibleScore) * 1000)
      : 0
    data.percentage = data.total > 0
      ? Math.round((data.correct / data.total) * 100)
      : 0
  })

  return submateriScores
}

/**
 * Analyze tryout progress over multiple attempts
 * @param {Array} tryoutScores - Array of score objects from latest_tryout_scores
 * @returns {Object} Analysis with trend and recommendations
 */
export function analyzeTryoutProgress(tryoutScores) {
  if (!tryoutScores || tryoutScores.length === 0) {
    return {
      average: 0,
      trend: 'insufficient_data',
      consistency: 0,
      recommendations: []
    }
  }

  // Calculate average
  const scores = tryoutScores.map(t => t.normalizedScore || 0)
  const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  // Calculate trend (comparing first half vs second half)
  let trend = 'stable'
  if (scores.length >= 2) {
    const firstScore = scores[0]
    const lastScore = scores[scores.length - 1]
    const diff = lastScore - firstScore
    
    if (diff > 50) trend = 'improving'
    else if (diff < -50) trend = 'declining'
  }

  // Calculate consistency (standard deviation)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)
  const consistency = Math.max(0, 100 - stdDev)

  // Generate recommendations
  const recommendations = []
  
  if (trend === 'declining') {
    recommendations.push('Review materi yang sering salah')
    recommendations.push('Tingkatkan intensitas latihan')
  } else if (trend === 'improving') {
    recommendations.push('Pertahankan pola belajar saat ini')
    recommendations.push('Fokus di submateri yang masih lemah')
  }

  if (consistency < 50) {
    recommendations.push('Tingkatkan konsistensi dengan jadwal rutin')
  }

  if (average < 500) {
    recommendations.push('Perbanyak latihan soal UTBK')
    recommendations.push('Review pembahasan setiap tryout')
  }

  return {
    average,
    trend,
    consistency: Math.round(consistency),
    recommendations
  }
}
