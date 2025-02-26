import { useState, useEffect, useRef } from 'react'
import '../styles/QuizRunner.css'

const QuizRunner = ({ questions, quizName, onClose, isDarkMode, onThemeToggle }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState([])
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set())
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [completionTime, setCompletionTime] = useState(0)
  const [shuffledQuestions, setShuffledQuestions] = useState([])
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showSubmitWarning, setShowSubmitWarning] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(null)
  const [previewImageDimensions, setPreviewImageDimensions] = useState({ width: 0, height: 0 })
  
  const timerRef = useRef(null)
  
  // Fisher-Yates shuffle algorithm
  const shuffle = (array) => {
    let currentIndex = array.length, randomIndex
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex--
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }
    return array
  }

  // Determine if the current question has multiple correct answers
  const isMultiple = shuffledQuestions[currentIndex]?.correct?.length > 1

  // Shuffle questions and their answers on component mount
  useEffect(() => {
    // Create a copy of the questions array and shuffle it
    const shuffled = shuffle([...questions]).map(q => {
      // Create arrays for answers and their corresponding correct states
      const answerPairs = q.answers.map((answer, idx) => ({
        id: `answer_${idx}_${Math.random().toString(36).substring(2, 9)}`,
        text: answer,
        isCorrect: q.correct.includes(answer)
      }))
      
      // Shuffle the answer pairs
      const shuffledPairs = shuffle([...answerPairs])
      
      // Separate back into answers and correct arrays
      const shuffledAnswers = shuffledPairs.map(pair => pair.id)
      const correctIds = shuffledPairs
        .filter(pair => pair.isCorrect)
        .map(pair => pair.id)
      
      // Create the answer map
      const answerMap = new Map(shuffledPairs.map(pair => [pair.id, pair.text]))
      
      return {
        ...q,
        answers: shuffledAnswers,
        correct: correctIds,
        answerMap
      }
    })
    
    setShuffledQuestions(shuffled)
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

  const handleAnswerChange = (uniqueId, isMultiple = false) => {
    setUserAnswers(prev => {
      const newAnswers = [...prev]
      if (isMultiple) {
        const currentAnswer = prev[currentIndex] || []
        if (currentAnswer.includes(uniqueId)) {
          newAnswers[currentIndex] = currentAnswer.filter(a => a !== uniqueId)
        } else {
          newAnswers[currentIndex] = [...currentAnswer, uniqueId]
        }
      } else {
        newAnswers[currentIndex] = uniqueId
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
    setCompletionTime(Math.floor((Date.now() - startTime) / 1000))
  }

  const getQuestionStatus = (index) => {
    const isFlagged = flaggedQuestions.has(index);
    
    if (isSubmitted) {
      const isCorrect = checkAnswer(index);
      // Return both the correctness status and flagged status if applicable
      return `${isCorrect ? 'correct' : 'incorrect'}${isFlagged ? ' flagged' : ''}`;
    }
    
    const isAnswered = Boolean(userAnswers[index] && 
      (Array.isArray(userAnswers[index]) ? userAnswers[index].length > 0 : true));
    
    if (isFlagged && isAnswered) return 'flagged-answered';
    if (isFlagged) return 'flagged';
    if (isAnswered) return 'answered';
    return 'unanswered';
  }

  const checkAnswer = (index) => {
    const question = shuffledQuestions[index]
    const userAnswer = userAnswers[index]
    if (!userAnswer) return false
    if (question.correct.length > 1) {
      return JSON.stringify([...userAnswer].sort()) === JSON.stringify([...question.correct].sort())
    }
    return question.correct.includes(userAnswer)
  }

  const getQuizStats = () => {
    let correct = 0
    let incorrect = 0
    
    shuffledQuestions.forEach((_, index) => {
      if (checkAnswer(index)) {
        correct++
      } else {
        incorrect++
      }
    })
    
    const total = shuffledQuestions.length
    const percentage = Math.round((correct / total) * 100)
    
    return { correct, incorrect, total, percentage }
  }

  const getUnansweredCount = () => {
    return shuffledQuestions.length - userAnswers.filter(a => a && (Array.isArray(a) ? a.length > 0 : true)).length
  }

  const handleExitClick = () => {
    setShowExitWarning(true)
  }

  const handleSubmitClick = () => {
    setShowSubmitWarning(true)
  }

  const handleExportResults = () => {
    // Generate a properly formatted date string (DD-MMM-YYYY)
    const now = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}${months[now.getMonth()]}${now.getFullYear()}`;
    
    // Create a sanitized quiz name (remove spaces, special chars)
    const sanitizedQuizName = quizName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Combine into filename
    const filename = `quiz_results_${sanitizedQuizName}_${formattedDate}.txt`;
    
    // Use completion time instead of calculating current time
    const minutes = Math.floor(completionTime / 60);
    const seconds = completionTime % 60;
    
    // Calculate score
    const score = getQuizStats().correct;
    const total = shuffledQuestions.length;
    const percentage = (score / total * 100).toFixed(1);

    // Create content with detailed formatting similar to Python version
    let content = "Quiz Results Summary\n";
    content += "==================================================\n\n";
    
    // Add quiz name
    content += `Quiz Name: ${quizName}\n`;
    content += `Date: ${formattedDate}\n\n`;
    
    // Add score and time information
    content += `Final Score: ${score}/${total} (${percentage}%)\n`;
    content += `Time Taken: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}\n\n`;
    
    // Add detailed analysis section
    content += "Detailed Question Analysis\n";
    content += "==================================================\n\n";
    
    // Use shuffledQuestions array to maintain the order the user saw
    shuffledQuestions.forEach((question, index) => {
      const answer = userAnswers[index];
      
      content += `Question ${index + 1}:\n`;
      content += `${question.question}\n\n`;
      
      // Get the actual answer text using the answerMap
      const userAnswerText = !answer ? "No answer provided" : 
                          (Array.isArray(answer) 
                            ? answer.map(id => question.answerMap.get(id)).join(", ")
                            : question.answerMap.get(answer));
      
      content += `Your Answer: ${userAnswerText}\n`;
      
      // Get correct answer text using the answerMap
      const correctAnswerText = question.correct
        .map(id => question.answerMap.get(id))
        .join(", ");
      content += `Correct Answer: ${correctAnswerText}\n`;
      
      // Status (correct/incorrect/unanswered)
      let status = "Unanswered";
      if (answer) {
        status = checkAnswer(index) ? 'Correct' : 'Incorrect';
      }
      content += `Status: ${status}\n`;
      
      // Explanation
      content += `Explanation: ${question.explanation || 'No explanation provided.'}\n`;
      
      // Separator between questions
      content += "\n--------------------------------------------------\n\n";
    });
    
    // Create and download the file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Helper function to get display text from unique ID
  const getAnswerText = (uniqueId) => {
    return currentQuestion.answerMap?.get(uniqueId) || uniqueId
  }

  const handleImageClick = (image) => {
    setShowImagePreview(image)
    
    // Get the natural dimensions of the image
    const img = new Image()
    img.onload = () => {
      setPreviewImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    img.src = image
  }

  const closeImagePreview = () => {
    setShowImagePreview(null)
  }

  // Render image thumbnails with hover functionality
  const renderImages = (images) => {
    if (!images || !Array.isArray(images) || images.length === 0) return null
    
    return (
      <div className="quiz-images-container">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="quiz-image-thumbnail-container"
            onClick={() => handleImageClick(image)}
            title="Click to enlarge"
          >
            <img 
              src={image} 
              alt={`Image ${index + 1}`} 
              className="quiz-image-thumbnail"
            />
          </div>
        ))}
      </div>
    )
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
              onClick={handleExportResults}
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
          
          <h2 className={flaggedQuestions.has(currentIndex) ? 'flagged' : ''}>
            Question {currentIndex + 1} of {shuffledQuestions.length}
          </h2>
          <p className="question-text">{currentQuestion.question}</p>
          
          {/* Display question images if they exist */}
          {renderImages(currentQuestion.questionImages)}
          
          <div className="options-container">
            {currentQuestion.answers && currentQuestion.answers.map((uniqueId, idx) => {
              const isChecked = isMultiple
                ? (userAnswers[currentIndex] || []).includes(uniqueId)
                : userAnswers[currentIndex] === uniqueId

              // Get the actual answer text from the unique ID
              const answerText = getAnswerText(uniqueId)
              
              // Check if this is a correct answer (for highlighting after submission)
              const isCorrectAnswer = currentQuestion.correct.includes(uniqueId)

              return (
                <label 
                  key={uniqueId} 
                  className={`option-label ${isSubmitted && isCorrectAnswer ? 'correct-answer' : ''}`}
                >
                  <input
                    type={isMultiple ? 'checkbox' : 'radio'}
                    name={`question-${currentIndex}`}
                    value={uniqueId}
                    checked={isChecked}
                    onChange={() => handleAnswerChange(uniqueId, isMultiple)}
                    disabled={isSubmitted}
                  />
                  <span className="option-text">{answerText}</span>
                </label>
              )
            })}
          </div>

          {isSubmitted && (
            <div className={`results ${checkAnswer(currentIndex) ? 'correct' : 'incorrect'}`}>
              <p><span className="result-label">Your Answer:</span> {Array.isArray(userAnswers[currentIndex]) 
                ? userAnswers[currentIndex]?.map(id => getAnswerText(id)).join(', ') 
                : getAnswerText(userAnswers[currentIndex]) || 'No answer'}</p>
              <p><span className="result-label">Correct Answer:</span> {currentQuestion.correct.map(id => getAnswerText(id)).join(', ')}</p>
              <p><span className="result-label">Explanation:</span> {currentQuestion.explanation || 'No explanation provided.'}</p>
              
              {/* Display explanation images if they exist */}
              {renderImages(currentQuestion.explanationImages)}
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

      {/* Full-size image preview */}
      {showImagePreview && (
        <div className="quiz-image-preview-overlay" onClick={closeImagePreview}>
          <div className="quiz-image-preview-container">
            <img 
              src={showImagePreview} 
              alt="Preview" 
              className="quiz-image-preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizRunner 