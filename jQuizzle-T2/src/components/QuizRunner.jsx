import { useState, useEffect, useRef } from 'react'
import '../styles/QuizRunner.css'

const QuizRunner = ({ questions, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState(new Array(questions.length).fill(null))
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set())
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const timerRef = useRef(null)

  // Timer effect
  useEffect(() => {
    if (!isSubmitted) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [startTime, isSubmitted])

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (answer, isMultiple = false) => {
    setUserAnswers(prev => {
      const newAnswers = [...prev]
      if (isMultiple) {
        // Handle multiple choice (checkboxes)
        const currentAnswer = prev[currentIndex] || []
        if (currentAnswer.includes(answer)) {
          newAnswers[currentIndex] = currentAnswer.filter(a => a !== answer)
        } else {
          newAnswers[currentIndex] = [...currentAnswer, answer]
        }
      } else {
        // Handle single choice (radio buttons)
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
    const isAnswered = Boolean(userAnswers[index])
    
    if (isFlagged && isAnswered) return 'flagged-answered'
    if (isFlagged) return 'flagged'
    if (isAnswered) return 'answered'
    return 'unanswered'
  }

  const checkAnswer = (index) => {
    const question = questions[index]
    const userAnswer = userAnswers[index]
    
    if (!userAnswer) return false
    
    if (Array.isArray(userAnswer)) {
      // Multiple choice
      return JSON.stringify(userAnswer.sort()) === JSON.stringify(question.correct.sort())
    } else {
      // Single choice
      return question.correct.includes(userAnswer)
    }
  }

  return (
    <div className="quiz-runner">
      {/* Left panel - Question navigation */}
      <div className="question-nav">
        <div className="nav-header">
          <button 
            className="flag-button"
            onClick={toggleFlag}
          >
            {flaggedQuestions.has(currentIndex) ? 'Unflag Question' : 'Flag Question'}
          </button>
        </div>
        <div className="question-grid">
          {questions.map((_, index) => (
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
        <div className="timer">Time: {formatTime(elapsedTime)}</div>
        
        <div className="question-container">
          <h2>Question {currentIndex + 1}</h2>
          <p className="question-text">{questions[currentIndex].question}</p>
          
          <div className="options-container">
            {questions[currentIndex].answers.map((option, idx) => {
              const isMultiple = questions[currentIndex].correct.length > 1
              const InputType = isMultiple ? 'checkbox' : 'radio'
              const currentAnswer = userAnswers[currentIndex]
              const isChecked = isMultiple 
                ? currentAnswer?.includes(option)
                : currentAnswer === option

              return (
                <label key={idx} className="option-label">
                  <input
                    type={InputType}
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
            disabled={currentIndex === questions.length - 1}
          >
            Next
          </button>
        </div>

        {!isSubmitted && (
          <button 
            className="submit-button"
            onClick={handleSubmit}
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  )
}

export default QuizRunner 