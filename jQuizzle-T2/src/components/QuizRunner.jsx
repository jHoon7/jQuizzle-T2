import { useState, useEffect, useRef } from 'react'
import '../styles/QuizRunner.css'

const QuizRunner = ({ questions, quizName, onClose, isDarkMode, onThemeToggle }) => {
  // Group all useState hooks together at the top
  const [currentIndex, setCurrentIndex] = useState(0)
  const [shuffledQuestions, setShuffledQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState([])
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set())
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showSubmitWarning, setShowSubmitWarning] = useState(false)

  // useRef after useState
  const timerRef = useRef(null)

  // Utility functions
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Group useEffect hooks together
  useEffect(() => {
    // Initialize shuffled questions
    const shuffled = shuffleArray([...questions]).map(question => {
      const shuffledAnswers = shuffleArray([...question.answers])
      const correctAnswers = shuffledAnswers.filter(answer => 
        question.correct.includes(answer)
      )
      
      return {
        ...question,
        answers: shuffledAnswers,
        correct: correctAnswers
      }
    })
    
    setShuffledQuestions(shuffled)
    setUserAnswers(new Array(shuffled.length).fill(null))
  }, [questions])

  useEffect(() => {
    // Timer effect
    if (!isSubmitted) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [startTime, isSubmitted])

  // Update all references to 'questions' to use 'shuffledQuestions'
  const currentQuestion = shuffledQuestions[currentIndex] || {}
  
  // Wait for shuffling to complete before rendering
  if (shuffledQuestions.length === 0) {
    return null
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (answer, isMultiple = false) => {
    setUserAnswers(prev => {
      const newAnswers = [...prev]
      if (isMultiple) {
        const currentAnswer = prev[currentIndex] || []
        if (currentAnswer.includes(answer)) {
          newAnswers[currentIndex] = currentAnswer.filter(a => a !== answer)
        } else {
          newAnswers[currentIndex] = [...currentAnswer, answer]
        }
      } else {
        newAnswers[currentIndex] = answer
      }
      return newAnswers
    })
  }

  const toggleFlag = () => {
    setFlaggedQuestions(prev => {
      const newFlags = new Set(prev)
      if (newFlags.has(currentIndex)) {
        newFlags.delete(currentIndex)
      } else {
        newFlags.add(currentIndex)
      }
      return newFlags
    })
  }

  const handleSubmit = () => {
    clearInterval(timerRef.current)
    setIsSubmitted(true)
  }

  const getQuestionStatus = (index) => {
    if (isSubmitted) {
      const isCorrect = checkAnswer(index)
      return isCorrect ? 'correct' : 'incorrect'
    }
    
    const isFlagged = flaggedQuestions.has(index)
    const isAnswered = Boolean(userAnswers[index] && 
      (Array.isArray(userAnswers[index]) ? userAnswers[index].length > 0 : true))
    
    if (isFlagged && isAnswered) return 'flagged-answered'
    if (isFlagged) return 'flagged'
    if (isAnswered) return 'answered'
    return 'unanswered'
  }

  const checkAnswer = (index) => {
    const question = shuffledQuestions[index]
    const userAnswer = userAnswers[index]
    if (!userAnswer) return false
    if (question.correct.length > 1) {
      return JSON.stringify(userAnswer.sort()) === JSON.stringify(question.correct.sort())
    }
    return question.correct.includes(userAnswer)
  }

  const exportResults = () => {
    const total = shuffledQuestions.length
    const score = userAnswers.reduce((acc, answer, idx) => acc + (checkAnswer(idx) ? 1 : 0), 0)
    const resultText = [
      `Quiz Results Summary\n${'='.repeat(50)}\n`,
      `Final Score: ${score}/${total} (${(score / total * 100).toFixed(1)}%)`,
      `Time Taken: ${formatTime(elapsedTime)}\n`,
      'Detailed Question Analysis\n' + '='.repeat(50) + '\n'
    ]

    shuffledQuestions.forEach((q, i) => {
      const userAnswer = userAnswers[i] || 'No answer'
      const isCorrect = checkAnswer(i)
      resultText.push(
        `Question ${i + 1}:\n${q.question}\n`,
        `Your Answer: ${Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer}`,
        `Correct Answer: ${q.correct.join(', ')}`,
        `Status: ${isCorrect ? 'Correct' : 'Incorrect'}`,
        `Explanation: ${q.explanation || 'No explanation provided.'}\n${'-'.repeat(50)}\n`
      )
    })

    const blob = new Blob([resultText.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz_results_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const isMultiple = currentQuestion.correct.length > 1

  const getUnansweredCount = () => {
    return userAnswers.filter(answer => !answer).length
  }

  const handleExitClick = () => {
    setShowExitWarning(true)
  }

  const handleSubmitClick = () => {
    setShowSubmitWarning(true)
  }

  // Add this helper function to calculate stats
  const getQuizStats = () => {
    const total = shuffledQuestions.length
    const correct = userAnswers.reduce((acc, _, idx) => acc + (checkAnswer(idx) ? 1 : 0), 0)
    const incorrect = total - correct
    const percentage = ((correct / total) * 100).toFixed(1)
    return { total, correct, incorrect, percentage }
  }

  return (
    <div className="quiz-runner">
      {/* Left panel - Question navigation */}
      <div className="question-nav">
        <div className="nav-header">
          <button 
            className="exit-button"
            onClick={handleExitClick}
          >
            Exit Quiz
          </button>
          {!isSubmitted ? (
            <button 
              className="flag-button"
              onClick={toggleFlag}
            >
              <span className="button-icon">🚩</span>
              {flaggedQuestions.has(currentIndex) ? 'Unflag Question' : 'Flag Question'}
            </button>
          ) : (
            <button 
              className="export-button"
              onClick={exportResults}
            >
              <span className="button-icon">📥</span>
              Export Results
            </button>
          )}
        </div>
        <div className="question-grid">
          {shuffledQuestions.map((_, index) => (
            <button
              key={index}
              className={`question-number ${getQuestionStatus(index)}`}
              onClick={() => setCurrentIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="quiz-content">
        <div className="top-controls">
          <div className="timer">Time: {formatTime(elapsedTime)}</div>
          {!isSubmitted ? (
            <button 
              className="submit-button"
              onClick={handleSubmitClick}
            >
              Submit Quiz
            </button>
          ) : (
            <div className="quiz-stats">
              <div className="stats-grid">
                <div className="stat-item score">
                  <span className="stat-label">Score:</span>
                  <span className="stat-value">{getQuizStats().percentage}%</span>
                </div>
                <div className="stat-item correct">
                  <span className="stat-label">Correct:</span>
                  <span className="stat-value">{getQuizStats().correct}/{getQuizStats().total}</span>
                </div>
                <div className="stat-item incorrect">
                  <span className="stat-label">Incorrect:</span>
                  <span className="stat-value">{getQuizStats().incorrect}/{getQuizStats().total}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="question-container">
          <h1 className="quiz-name">{quizName}</h1>
          
          <h2>Question {currentIndex + 1} of {shuffledQuestions.length}</h2>
          <p className="question-text">{currentQuestion.question}</p>
          
          <div className="options-container">
            {currentQuestion.answers.map((option, idx) => {
              const isChecked = isMultiple
                ? (userAnswers[currentIndex] || []).includes(option)
                : userAnswers[currentIndex] === option

              return (
                <label key={idx} className="option-label">
                  <input
                    type={isMultiple ? 'checkbox' : 'radio'}
                    name={`question-${currentIndex}`}
                    value={option}
                    checked={isChecked}
                    onChange={() => handleAnswerChange(option, isMultiple)}
                    disabled={isSubmitted}
                  />
                  <span className="option-text">{option}</span>
                </label>
              )
            })}
          </div>

          {isSubmitted && (
            <div className={`results ${checkAnswer(currentIndex) ? 'correct' : 'incorrect'}`}>
              <p>Your Answer: {Array.isArray(userAnswers[currentIndex]) 
                ? userAnswers[currentIndex]?.join(', ') 
                : userAnswers[currentIndex] || 'No answer'}</p>
              <p>Correct Answer: {currentQuestion.correct.join(', ')}</p>
              <p>Explanation: {currentQuestion.explanation || 'No explanation provided.'}</p>
            </div>
          )}
        </div>

        <div className="navigation">
          <button
            onClick={() => setCurrentIndex(prev => prev - 1)}
            disabled={currentIndex === 0}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            disabled={currentIndex === shuffledQuestions.length - 1}
          >
            Next
          </button>
        </div>

        {/* Warning Modals */}
        {showExitWarning && (
          <div className="warning-modal-overlay">
            <div className="warning-modal">
              <h3>Exit Quiz?</h3>
              <p>Are you sure you want to exit? {!isSubmitted && 'Your progress will not be graded.'}</p>
              <div className="warning-buttons">
                <button onClick={() => setShowExitWarning(false)}>
                  Continue Quiz
                </button>
                {!isSubmitted && (
                  <button className="success" onClick={() => {
                    handleSubmit()
                    setShowExitWarning(false)
                  }}>
                    Grade Now
                  </button>
                )}
                <button className="danger" onClick={onClose}>
                  Exit {!isSubmitted && 'Without Grading'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSubmitWarning && (
          <div className="warning-modal-overlay">
            <div className="warning-modal">
              <h3>Submit Quiz?</h3>
              {getUnansweredCount() > 0 ? (
                <p>You have {getUnansweredCount()} unanswered {getUnansweredCount() === 1 ? 'question' : 'questions'}. Are you sure you want to submit?</p>
              ) : (
                <p>Are you ready to submit your quiz for grading?</p>
              )}
              <div className="warning-buttons">
                <button onClick={() => setShowSubmitWarning(false)}>
                  Continue Quiz
                </button>
                <button className="success" onClick={() => {
                  setShowSubmitWarning(false)
                  handleSubmit()
                }}>
                  Submit for Grading
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add theme toggle button */}
        <button 
          className="theme-toggle-button"
          onClick={onThemeToggle}
          aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  )
}

export default QuizRunner 