// UTBK Scoring System
// Benar: +4, Salah: -1, Kosong: 0

export function calculateUTBKScore(totalQuestions, correctAnswers, wrongAnswers) {
  const unanswered = totalQuestions - correctAnswers - wrongAnswers
  
  // Raw score
  const rawScore = (correctAnswers * 4) - (wrongAnswers * 1)
  
  // Maximum possible score
  const maxScore = totalQuestions * 4
  
  // Normalize to 0-1000 scale (UTBK-like)
  const normalizedScore = Math.max(0, Math.round((rawScore / maxScore) * 1000))
  
  return {
    rawScore,
    normalizedScore,
    correct: correctAnswers,
    wrong: wrongAnswers,
    unanswered,
    total: totalQuestions,
    percentage: Math.round((correctAnswers / totalQuestions) * 100)
  }
}

export function calculatePerSubmateri(questions, answers) {
  const submateriScores = {}
  
  questions.forEach(q => {
    const submateri = q.submateri
    if (!submateriScores[submateri]) {
      submateriScores[submateri] = {
        total: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0
      }
    }
    
    submateriScores[submateri].total++
    
    const userAnswer = answers[q.id]?.answer
    if (!userAnswer) {
      submateriScores[submateri].unanswered++
    } else if (userAnswer === q.correct_answer) {
      submateriScores[submateri].correct++
    } else {
      submateriScores[submateri].wrong++
    }
  })
  
  // Calculate scores for each submateri
  Object.keys(submateriScores).forEach(submateri => {
    const data = submateriScores[submateri]
    const score = calculateUTBKScore(data.total, data.correct, data.wrong)
    submateriScores[submateri].score = score.normalizedScore
    submateriScores[submateri].rawScore = score.rawScore
    submateriScores[submateri].percentage = score.percentage
  })
  
  return submateriScores
}

export function analyzeTryoutProgress(tryoutScores) {
  // tryoutScores = array of latest 3 tryout results
  if (tryoutScores.length < 3) {
    return null // Not enough data
  }
  
  const scores = tryoutScores.map(t => t.normalizedScore)
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  
  // Trend analysis
  const trend = scores[2] > scores[0] ? 'improving' : 
                scores[2] < scores[0] ? 'declining' : 'stable'
  
  // Consistency check (standard deviation)
  const mean = avgScore
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)
  const consistency = stdDev < 50 ? 'consistent' : stdDev < 100 ? 'moderate' : 'inconsistent'
  
  // Submateri analysis
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
      category: avg >= 80 ? 'strong' : avg >= 60 ? 'good' : avg >= 40 ? 'needs_improvement' : 'weak'
    }
  })
  
  return analysis
}

function generateRecommendations(avgScore, trend, submateriAnalysis) {
  const recommendations = []
  
  // Overall recommendation
  if (avgScore >= 700) {
    recommendations.push({
      type: 'overall',
      message: 'Performa sangat baik! Pertahankan konsistensi dan fokus pada detail.'
    })
  } else if (avgScore >= 600) {
    recommendations.push({
      type: 'overall',
      message: 'Performa baik. Tingkatkan pemahaman konsep dan kecepatan mengerjakan.'
    })
  } else {
    recommendations.push({
      type: 'overall',
      message: 'Perlu peningkatan signifikan. Fokus pada penguasaan materi dasar.'
    })
  }
  
  // Trend recommendation
  if (trend === 'declining') {
    recommendations.push({
      type: 'trend',
      message: 'Tren menurun terdeteksi. Review strategi belajar dan jaga stamina.'
    })
  } else if (trend === 'improving') {
    recommendations.push({
      type: 'trend',
      message: 'Tren positif! Terus tingkatkan momentum belajar.'
    })
  }
  
  // Submateri recommendations
  const weakSubjects = Object.keys(submateriAnalysis)
    .filter(sub => submateriAnalysis[sub].category === 'weak' || submateriAnalysis[sub].category === 'needs_improvement')
    .sort((a, b) => submateriAnalysis[a].avgPercentage - submateriAnalysis[b].avgPercentage)
    .slice(0, 3)
  
  if (weakSubjects.length > 0) {
    recommendations.push({
      type: 'focus',
      message: `Prioritas belajar: ${weakSubjects.join(', ')}`
    })
  }
  
  return recommendations
}
