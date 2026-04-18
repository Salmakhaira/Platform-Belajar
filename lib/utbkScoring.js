// UTBK IRT-Based Scoring System
// Benar: skor berdasarkan difficulty
// Salah: 0 poin (TIDAK ADA PENGURANGAN!)
// Kosong: 0 poin

export function calculateIRTScore(questions, answers) {
  let totalScore = 0
  let maxPossibleScore = 0
  let correct = 0
  let wrong = 0
  let unanswered = 0
  
  const difficultyWeights = {
    'easy': 1,
    'medium': 2,
    'hard': 3
  }
  
  questions.forEach(q => {
    const difficulty = q.difficulty || 'medium'
    const weight = difficultyWeights[difficulty]
    maxPossibleScore += weight
    
    const userAnswer = answers[q.id]?.answer
    
    if (!userAnswer) {
      unanswered++
    } else if (userAnswer === q.correct_answer) {
      totalScore += weight
      correct++
    } else {
      wrong++
    }
  })
  
  const normalizedScore = maxPossibleScore > 0 
    ? Math.round((totalScore / maxPossibleScore) * 1000)
    : 0
  
  const percentage = questions.length > 0
    ? Math.round((correct / questions.length) * 100)
    : 0
  
  return {
    rawScore: totalScore,
    maxPossibleScore: maxPossibleScore,
    normalizedScore: normalizedScore,
    correct: correct,
    wrong: wrong,
    unanswered: unanswered,
    total: questions.length,
    percentage: percentage
  }
}

export function calculatePerSubmateri(questions, answers) {
  const submateriScores = {}
  
  const difficultyWeights = {
    'easy': 1,
    'medium': 2,
    'hard': 3
  }
  
  questions.forEach(q => {
    const submateri = q.submateri
    if (!submateriScores[submateri]) {
      submateriScores[submateri] = {
        total: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        rawScore: 0,
        maxScore: 0
      }
    }
    
    const difficulty = q.difficulty || 'medium'
    const weight = difficultyWeights[difficulty]
    
    submateriScores[submateri].total++
    submateriScores[submateri].maxScore += weight
    
    const userAnswer = answers[q.id]?.answer
    if (!userAnswer) {
      submateriScores[submateri].unanswered++
    } else if (userAnswer === q.correct_answer) {
      submateriScores[submateri].correct++
      submateriScores[submateri].rawScore += weight
    } else {
      submateriScores[submateri].wrong++
    }
  })
  
  Object.keys(submateriScores).forEach(submateri => {
    const data = submateriScores[submateri]
    data.normalizedScore = data.maxScore > 0
      ? Math.round((data.rawScore / data.maxScore) * 1000)
      : 0
    data.percentage = data.total > 0
      ? Math.round((data.correct / data.total) * 100)
      : 0
  })
  
  return submateriScores
}

export function analyzeTryoutProgress(tryoutScores) {
  if (tryoutScores.length < 3) {
    return null
  }
  
  const scores = tryoutScores.map(t => t.normalizedScore || 0)
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  
  const trend = scores[2] > scores[0] ? 'improving' : 
                scores[2] < scores[0] ? 'declining' : 'stable'
  
  const mean = avgScore
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)
  const consistency = stdDev < 50 ? 'consistent' : stdDev < 100 ? 'moderate' : 'inconsistent'
  
  const submateriAnalysis = analyzeSubmateriStrengths(tryoutScores)
  
  return {
    avgScore,
    trend,
    consistency,
    stdDev: Math.round(stdDev),
    improvement: scores[2] - scores[0],
    submateriAnalysis,
    recommendations: generateRecommendations(avgScore, trend, submateriAnalysis)
  }
}

function analyzeSubmateriStrengths(tryoutScores) {
  const submateriTotals = {}
  
  tryoutScores.forEach(tryout => {
    Object.keys(tryout.submateriScores || {}).forEach(submateri => {
      if (!submateriTotals[submateri]) {
        submateriTotals[submateri] = []
      }
      submateriTotals[submateri].push(tryout.submateriScores[submateri].percentage)
    })
  })
  
  const analysis = {}
  Object.keys(submateriTotals).forEach(submateri => {
    const scores = submateriTotals[submateri]
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    analysis[submateri] = {
      avgPercentage: Math.round(avg),
      category: avg >= 70 ? 'strong' : avg >= 50 ? 'good' : avg >= 30 ? 'needs_improvement' : 'weak'
    }
  })
  
  return analysis
}

function generateRecommendations(avgScore, trend, submateriAnalysis) {
  const recommendations = []
  
  if (avgScore >= 70) {
    recommendations.push({
      type: 'overall',
      message: 'Performa sangat baik! Pertahankan konsistensi.'
    })
  } else if (avgScore >= 50) {
    recommendations.push({
      type: 'overall',
      message: 'Performa baik. Tingkatkan latihan rutin.'
    })
  } else if (avgScore >= 30) {
    recommendations.push({
      type: 'overall',
      message: 'Performa cukup. Fokus pada materi dasar.'
    })
  } else {
    recommendations.push({
      type: 'overall',
      message: 'Perlu peningkatan. Pelajari konsep dasar.'
    })
  }
  
  if (trend === 'declining') {
    recommendations.push({
      type: 'trend',
      message: 'Tren menurun. Review strategi belajar.'
    })
  } else if (trend === 'improving') {
    recommendations.push({
      type: 'trend',
      message: 'Tren positif! Pertahankan momentum.'
    })
  }
  
  const weakSubjects = Object.keys(submateriAnalysis)
    .filter(sub => submateriAnalysis[sub].category === 'weak' || submateriAnalysis[sub].category === 'needs_improvement')
    .sort((a, b) => submateriAnalysis[a].avgPercentage - submateriAnalysis[b].avgPercentage)
    .slice(0, 3)
  
  if (weakSubjects.length > 0) {
    recommendations.push({
      type: 'focus',
      message: `Prioritas: ${weakSubjects.join(', ')}`
    })
  }
  
  return recommendations
}
