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
      recommendations: [],
      submateriAnalysis: {}
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

  // Calculate submateri analysis
  const submateriAnalysis = {}
  const submateriData = {}

  // Aggregate submateri scores across tryouts
  tryoutScores.forEach(tryout => {
    const subScores = tryout.submateriScores || {}
    Object.keys(subScores).forEach(sub => {
      if (!submateriData[sub]) {
        submateriData[sub] = []
      }
      submateriData[sub].push(subScores[sub].percentage || 0)
    })
  })

  // Calculate average per submateri
  Object.keys(submateriData).forEach(sub => {
    const percentages = submateriData[sub]
    const avgPercentage = Math.round(
      percentages.reduce((a, b) => a + b, 0) / percentages.length
    )
    
    let category = 'weak'
    if (avgPercentage >= 80) category = 'strong'
    else if (avgPercentage >= 70) category = 'good'
    else if (avgPercentage >= 50) category = 'needs_improvement'
    
    submateriAnalysis[sub] = {
      avgPercentage,
      category
    }
  })

  // Generate recommendations (FIXED: return objects with type and message)
  const recommendations = []
  
  if (trend === 'declining') {
    recommendations.push({
      type: 'trend',
      message: 'Review materi yang sering salah dan tingkatkan intensitas latihan'
    })
  } else if (trend === 'improving') {
    recommendations.push({
      type: 'trend',
      message: 'Pertahankan pola belajar saat ini dan fokus di submateri yang masih lemah'
    })
  }

  if (consistency < 50) {
    recommendations.push({
      type: 'overall',
      message: 'Tingkatkan konsistensi dengan jadwal belajar yang rutin'
    })
  }

  if (average < 500) {
    recommendations.push({
      type: 'overall',
      message: 'Perbanyak latihan soal UTBK dan review pembahasan setiap tryout'
    })
  }

  // Add focus recommendations based on weak submateri
  const weakSubmateri = Object.entries(submateriAnalysis)
    .filter(([, data]) => data.category === 'weak')
    .map(([sub]) => sub)
  
  if (weakSubmateri.length > 0) {
    recommendations.push({
      type: 'focus',
      message: `Fokus intensif di: ${weakSubmateri.join(', ')}`
    })
  }

  return {
    average,
    avgScore: Math.round((average / 1000) * 100), // percentage for display
    trend,
    improvement: scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0,
    consistency: consistency >= 70 ? 'consistent' : consistency >= 40 ? 'moderate' : 'fluctuating',
    stdDev: Math.round(stdDev),
    recommendations,
    submateriAnalysis
  }
}
