import { useState, useEffect } from 'react'
import '../styles/PracticeModeRunner.css'

const PracticeModeRunner = ({ questions, quizName, onClose, isDarkMode, onThemeToggle }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState(Array(questions.length).fill([]))
  const [isSubmitted, setIsSubmitted] = useState(Array(questions.length).fill(false))
  const [showExplanation, setShowExplanation] = useState(Array(questions.length).fill(false))
  const [showImagePreview, setShowImagePreview] = useState(null)
  const [score, setScore] = useState(0)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [results, setResults] = useState(Array(questions.length).fill(null)) // null, true (correct), false (incorrect)
  // Add state for exit confirmation
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)
  
  // Current question from the questions array
  const currentQuestion = questions[currentIndex] || {}
  
  // Function to check if current question has multiple correct answers
  const isMultipleChoice = (questionIndex = currentIndex) => {
    const question = questions[questionIndex]
    if (!question) return false
    if (question.shuffledCorrectIds && question.shuffledCorrectIds.length > 1) return true
    if (question.correct && question.correct.length > 1) return true
    return false
  }

  // Handle selecting an answer
  const handleAnswerSelect = (answerIndex) => {
    if (isSubmitted[currentIndex]) return // Don't allow changes after submission
    
    const newSelectedAnswers = [...selectedAnswers]
    
    if (isMultipleChoice()) {
      const currentSelections = [...(newSelectedAnswers[currentIndex] || [])]
      if (currentSelections.includes(answerIndex)) {
        newSelectedAnswers[currentIndex] = currentSelections.filter(idx => idx !== answerIndex)
      } else {
        newSelectedAnswers[currentIndex] = [...currentSelections, answerIndex]
      }
    } else {
      newSelectedAnswers[currentIndex] = [answerIndex]
    }
    
    setSelectedAnswers(newSelectedAnswers)
  }

  // Handle submitting the answer
  const handleSubmit = () => {
    const newIsSubmitted = [...isSubmitted]
    newIsSubmitted[currentIndex] = true
    setIsSubmitted(newIsSubmitted)
    
    // Check if answer is correct
    const isCorrect = checkAnswer(currentIndex)
    
    // Update results array
    const newResults = [...results]
    newResults[currentIndex] = isCorrect
    setResults(newResults)
    
    // Update score only if this is the first time answering this question
    if (results[currentIndex] === null) {
      if (isCorrect) {
        setScore(prev => prev + 1)
      }
      setQuestionsAnswered(prev => prev + 1)
    }
  }

  // Move to the next question
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  // Move to the previous question
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  // Go to a specific question
  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index)
    }
  }

  // Toggle explanation visibility
  const toggleExplanation = () => {
    const newShowExplanation = [...showExplanation]
    newShowExplanation[currentIndex] = !newShowExplanation[currentIndex]
    setShowExplanation(newShowExplanation)
  }

  // Check if the answer is correct
  const checkAnswer = (index = currentIndex) => {
    const question = questions[index]
    const userAnswer = selectedAnswers[index]
    
    if (!question || !userAnswer || userAnswer.length === 0) return false
    
    // Handle shuffled answers (from App.jsx pre-processing)
    if (question.shuffledCorrectIds) {
      if (isMultipleChoice(index)) {
        return JSON.stringify([...userAnswer].sort()) === 
               JSON.stringify([...question.shuffledCorrectIds].sort())
      }
      // For single choice
      return question.shuffledCorrectIds.includes(userAnswer[0])
    }
    
    // Fallback for older format
    if (question.correct) {
      if (isMultipleChoice(index)) {
        return JSON.stringify([...userAnswer].sort()) === 
               JSON.stringify([...question.correct].sort())
      }
      return question.correct.includes(userAnswer[0])
    }
    
    return false
  }

  // Get the answer text
  const getAnswerText = (index) => {
    if (!currentQuestion) return ''
    
    // For pre-shuffled data from App.jsx
    if (currentQuestion.shuffledAnswers) {
      return currentQuestion.shuffledAnswers[index]
    }
    
    // Fallback for legacy format
    if (currentQuestion.answers && Array.isArray(currentQuestion.answers)) {
      if (typeof currentQuestion.answers[index] === 'object') {
        return currentQuestion.answers[index]?.text || `Option ${index+1}`
      }
      return currentQuestion.answers[index] || `Option ${index+1}`
    }
    
    return `Option ${index+1}`
  }

  // Handle image click to preview
  const handleImageClick = (image) => {
    setShowImagePreview(image)
  }

  // Close image preview
  const closeImagePreview = () => {
    setShowImagePreview(null)
  }

  // Render images from the question
  const renderImages = (images) => {
    if (!images || !Array.isArray(images) || images.length === 0) return null
    
    return (
      <div className="practice-images-container">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="practice-image-thumbnail-container"
            onClick={() => handleImageClick(image)}
          >
            <img 
              src={image} 
              alt={`Image ${index + 1}`} 
              className="practice-image-thumbnail"
            />
          </div>
        ))}
      </div>
    )
  }

  // Calculate the overall progress
  const calculateProgress = () => {
    return Math.round((questionsAnswered / questions.length) * 100)
  }

  // Get question status based on results
  const getQuestionStatus = (index) => {
    if (results[index] === true) return 'correct'
    if (results[index] === false) return 'incorrect'
    if (selectedAnswers[index] && selectedAnswers[index].length > 0) return 'answered'
    return 'unanswered'
  }

  // Add handler for exit button
  const handleExitClick = () => {
    setShowExitConfirmation(true)
  }

  // Handle confirmation of exit
  const handleConfirmExit = () => {
    onClose()
  }

  // Handle cancellation of exit
  const handleCancelExit = () => {
    setShowExitConfirmation(false)
  }

  // Early return if no questions are available
  if (!questions || questions.length === 0) {
    return <div className="practice-mode-runner">Loading questions...</div>
  }

  return (
    <div className={`practice-mode-runner ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Header section */}
      <div className="practice-header">
        <button className="practice-close-button" onClick={handleExitClick}>
          Exit Practice
        </button>
        <h2 className="practice-title">{quizName}</h2>
        <button 
          className="practice-theme-toggle"
          onClick={onThemeToggle}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
      </div>

      <div className="practice-main-content">
        {/* Question panel */}
        <div className="practice-question-nav">
          <div className="practice-nav-header">
            <span>Questions</span>
          </div>
          
          <div className="practice-question-grid">
            {questions.map((_, index) => (
              <button
                key={index}
                className={`practice-question-button ${getQuestionStatus(index)} ${currentIndex === index ? 'active' : ''}`}
                onClick={() => goToQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <div className="practice-progress-info">
            <div>Score: {score}/{questionsAnswered}</div>
            <div>
              Question {currentIndex + 1} of {questions.length}
            </div>
          </div>
        </div>

        {/* Question content */}
        <div className="practice-content-area">
          {/* Progress bar */}
          <div className="practice-progress-container">
            <div className="practice-progress-bar">
              <div 
                className="practice-progress-fill" 
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
            <div className="practice-progress-text">
              <span>Completed: {questionsAnswered}/{questions.length}</span>
            </div>
          </div>

          {/* Question content */}
          <div className="practice-content">
            {/* Question */}
            <div className="practice-question">
              <h3>{currentQuestion.question}</h3>
              {renderImages(currentQuestion.questionImages)}
            </div>

            {/* Answer options */}
            <div className="practice-answers">
              {currentQuestion.shuffledAnswers && currentQuestion.shuffledAnswers.map((answer, idx) => {
                const isSelected = selectedAnswers[currentIndex]?.includes(idx)
                const isCorrect = currentQuestion.shuffledCorrectIds && 
                                currentQuestion.shuffledCorrectIds.includes(idx)
                
                // Determine the class for styling
                let optionClass = "practice-answer"
                if (isSelected) optionClass += " selected"
                if (isSubmitted[currentIndex]) {
                  if (isCorrect) optionClass += " correct"
                  else if (isSelected && !isCorrect) optionClass += " incorrect"
                }
                
                return (
                  <button 
                    key={idx}
                    className={optionClass}
                    onClick={() => handleAnswerSelect(idx)}
                    disabled={isSubmitted[currentIndex]}
                  >
                    {answer}
                  </button>
                )
              })}
            </div>

            {/* Result and explanation (shown after submission) */}
            {isSubmitted[currentIndex] && (
              <div className={`practice-result ${results[currentIndex] ? 'correct' : 'incorrect'}`}>
                <h4>{results[currentIndex] ? 'Correct!' : 'Incorrect'}</h4>
                
                <button 
                  className="practice-explanation-toggle" 
                  onClick={toggleExplanation}
                >
                  {showExplanation[currentIndex] ? 'Hide Explanation' : 'See Explanation'}
                </button>
                
                {showExplanation[currentIndex] && (
                  <div className="practice-explanation">
                    <p>{currentQuestion.explanation || 'No explanation provided.'}</p>
                    {renderImages(currentQuestion.explanationImages)}
                  </div>
                )}
              </div>
            )}

            {/* Updated action buttons layout */}
            <div className="practice-actions-container">
              {/* Submit button only shown for unanswered questions */}
              {!isSubmitted[currentIndex] && (
                <button 
                  className="practice-button submit"
                  onClick={handleSubmit}
                  disabled={!selectedAnswers[currentIndex] || selectedAnswers[currentIndex].length === 0}
                >
                  Submit
                </button>
              )}
              
              <div className="practice-navigation-buttons">
                <button 
                  className="practice-button previous"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  Previous
                </button>
                
                <button 
                  className="practice-button next"
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image preview modal */}
      {showImagePreview && (
        <div 
          className="practice-image-preview-overlay"
          onClick={closeImagePreview}
        >
          <div className="practice-image-preview-container">
            <img 
              src={showImagePreview} 
              alt="Preview" 
              className="practice-image-preview"
            />
          </div>
        </div>
      )}

      {/* Add exit confirmation modal */}
      {showExitConfirmation && (
        <div className="practice-exit-confirmation-overlay">
          <div className="practice-exit-confirmation">
            <h3>Exit Practice Mode?</h3>
            <p>Your progress for this session will not be saved.</p>
            <div className="practice-exit-buttons">
              <button 
                className="practice-exit-cancel"
                onClick={handleCancelExit}
              >
                Cancel
              </button>
              <button 
                className="practice-exit-confirm"
                onClick={handleConfirmExit}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PracticeModeRunner 