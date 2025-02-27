import { useState, useEffect, useRef } from 'react'
import '../styles/QuizRunner.css'

const QuizRunner = ({ questions, quizName, onClose, isDarkMode, onThemeToggle }) => {
  // Basic state setup
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState([])
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set())
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [completionTime, setCompletionTime] = useState(0)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showSubmitWarning, setShowSubmitWarning] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(null)
  const [previewImageDimensions, setPreviewImageDimensions] = useState({ width: 0, height: 0 })
  
  const timerRef = useRef(null)

  // Use questions directly from props without reshuffling
  const currentQuestion = questions[currentIndex] || {}
  
  // Check if current question has multiple correct answers
  const isMultiple = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.shuffledCorrectIds && currentQuestion.shuffledCorrectIds.length > 1) return true;
    if (currentQuestion.correct && currentQuestion.correct.length > 1) return true;
    return false;
  }

  // Set up timer
  useEffect(() => {
    if (!isSubmitted) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [startTime, isSubmitted])

  // Format time display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Handle user answer selection
  const handleAnswerChange = (answerIndex, isMultipleChoice) => {
    setUserAnswers(prev => {
      const newAnswers = [...prev]
      if (isMultipleChoice) {
        const currentAnswer = prev[currentIndex] || []
        if (currentAnswer.includes(answerIndex)) {
          newAnswers[currentIndex] = currentAnswer.filter(a => a !== answerIndex)
        } else {
          newAnswers[currentIndex] = [...currentAnswer, answerIndex]
        }
      } else {
        newAnswers[currentIndex] = answerIndex
      }
      return newAnswers
    })
  }

  // Toggle flagged state of current question
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

  // Handle quiz submission
  const handleSubmit = () => {
    clearInterval(timerRef.current)
    setIsSubmitted(true)
    setCompletionTime(Math.floor((Date.now() - startTime) / 1000))
  }

  // Determine question status (unanswered, answered, flagged, correct, incorrect)
  const getQuestionStatus = (index) => {
    const isFlagged = flaggedQuestions.has(index);
    
    if (isSubmitted) {
      const isCorrect = checkAnswer(index);
      return `${isCorrect ? 'correct' : 'incorrect'}${isFlagged ? ' flagged' : ''}`;
    }
    
    const userAnswer = userAnswers[index];
    const isAnswered = Boolean(userAnswer && 
      (Array.isArray(userAnswer) ? userAnswer.length > 0 : true));
    
    if (isFlagged && isAnswered) return 'flagged-answered';
    if (isFlagged) return 'flagged';
    if (isAnswered) return 'answered';
    return 'unanswered';
  }

  // Check if user's answer is correct
  const checkAnswer = (index) => {
    const question = questions[index];
    const userAnswer = userAnswers[index];
    
    if (!userAnswer || !question) return false;
    
    // Handle shuffled answers (from App.jsx pre-processing)
    if (question.shuffledCorrectIds) {
      if (Array.isArray(userAnswer)) {
        // For multiple choice
        return JSON.stringify([...userAnswer].sort()) === 
               JSON.stringify([...question.shuffledCorrectIds].sort());
      }
      // For single choice
      return question.shuffledCorrectIds.includes(userAnswer);
    }
    
    // Fallback for older format
    if (question.correct) {
      if (Array.isArray(userAnswer)) {
        return JSON.stringify([...userAnswer].sort()) === 
               JSON.stringify([...question.correct].sort());
      }
      return question.correct.includes(userAnswer);
    }
    
    return false;
  }

  // Calculate overall quiz statistics
  const getQuizStats = () => {
    let correct = 0;
    let incorrect = 0;
    
    questions.forEach((_, index) => {
      if (checkAnswer(index)) {
        correct++;
      } else {
        incorrect++;
      }
    });
    
    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);
    
    return { correct, incorrect, total, percentage };
  }

  // Count unanswered questions
  const getUnansweredCount = () => {
    return questions.length - userAnswers.filter(a => 
      a && (Array.isArray(a) ? a.length > 0 : true)
    ).length;
  }

  // UI handlers
  const handleExitClick = () => {
    setShowExitWarning(true);
  }

  const handleSubmitClick = () => {
    setShowSubmitWarning(true);
  }

  // Export quiz results as a text file
  const handleExportResults = () => {
    const now = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}${months[now.getMonth()]}${now.getFullYear()}`;
    
    const sanitizedQuizName = quizName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `quiz_results_${sanitizedQuizName}_${formattedDate}.txt`;
    
    const minutes = Math.floor(completionTime / 60);
    const seconds = completionTime % 60;
    
    const stats = getQuizStats();
    
    let content = "Quiz Results Summary\n";
    content += "==================================================\n\n";
    content += `Quiz Name: ${quizName}\n`;
    content += `Date: ${formattedDate}\n\n`;
    content += `Final Score: ${stats.correct}/${stats.total} (${stats.percentage}%)\n`;
    content += `Time Taken: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}\n\n`;
    content += "Detailed Question Analysis\n";
    content += "==================================================\n\n";
    
    questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      
      content += `Question ${index + 1}:\n`;
      content += `${question.question}\n\n`;
      
      // Get user answer text
      let userAnswerText = "No answer provided";
      if (userAnswer) {
        if (Array.isArray(userAnswer)) {
          userAnswerText = userAnswer.map(idx => 
            question.shuffledAnswers ? question.shuffledAnswers[idx] : 
            question.answers ? question.answers[idx] : `Option ${idx+1}`
          ).join(", ");
        } else {
          userAnswerText = question.shuffledAnswers ? question.shuffledAnswers[userAnswer] : 
                          question.answers ? question.answers[userAnswer] : `Option ${userAnswer+1}`;
        }
      }
      content += `Your Answer: ${userAnswerText}\n`;
      
      // Get correct answer text
      let correctAnswerText = "Unknown";
      if (question.shuffledCorrectIds) {
        correctAnswerText = question.shuffledCorrectIds.map(idx => 
          question.shuffledAnswers ? question.shuffledAnswers[idx] : `Option ${idx+1}`
        ).join(", ");
      } else if (question.correct && question.answers) {
        correctAnswerText = question.correct.map(correct => 
          typeof correct === 'number' ? question.answers[correct] : correct
        ).join(", ");
      }
      content += `Correct Answer: ${correctAnswerText}\n`;
      
      // Status
      let status = "Unanswered";
      if (userAnswer) {
        status = checkAnswer(index) ? 'Correct' : 'Incorrect';
      }
      content += `Status: ${status}\n`;
      
      content += `Explanation: ${question.explanation || 'No explanation provided.'}\n`;
      content += "\n--------------------------------------------------\n\n";
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Get the answer text to display
  const getAnswerText = (index) => {
    if (!currentQuestion) return '';
    
    // For pre-shuffled data from App.jsx
    if (currentQuestion.shuffledAnswers) {
      return currentQuestion.shuffledAnswers[index];
    }
    
    // Fallback for legacy format
    if (currentQuestion.answers && Array.isArray(currentQuestion.answers)) {
      if (typeof currentQuestion.answers[index] === 'object') {
        return currentQuestion.answers[index]?.text || `Option ${index+1}`;
      }
      return currentQuestion.answers[index] || `Option ${index+1}`;
    }
    
    return `Option ${index+1}`;
  }

  // Image preview handling
  const handleImageClick = (image) => {
    setShowImagePreview(image);
    
    const img = new Image();
    img.onload = () => {
      setPreviewImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.src = image;
  }

  const closeImagePreview = () => {
    setShowImagePreview(null);
  }

  // Render image thumbnails
  const renderImages = (images) => {
    if (!images || !Array.isArray(images) || images.length === 0) return null;
    
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
    );
  }

  // Early return if no questions are available
  if (!questions || questions.length === 0) {
    return <div className="quiz-runner">Loading quiz...</div>;
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
            Question {currentIndex + 1} of {questions.length}
          </h2>
          <p className="question-text">{currentQuestion.question}</p>
          
          {/* Display question images if they exist */}
          {renderImages(currentQuestion.questionImages)}
          
          <div className="options-container">
            {currentQuestion.shuffledAnswers && currentQuestion.shuffledAnswers.map((answer, idx) => {
              const isChecked = isMultiple() 
                ? (userAnswers[currentIndex] || []).includes(idx)
                : userAnswers[currentIndex] === idx;
              
              // Check if this is a correct answer (for highlighting after submission)
              const isCorrectAnswer = currentQuestion.shuffledCorrectIds && 
                                      currentQuestion.shuffledCorrectIds.includes(idx);

              return (
                <label 
                  key={idx} 
                  className={`option-label ${isSubmitted && isCorrectAnswer ? 'correct-answer' : ''}`}
                >
                  <input
                    type={isMultiple() ? 'checkbox' : 'radio'}
                    name={`question-${currentIndex}`}
                    value={idx}
                    checked={isChecked}
                    onChange={() => handleAnswerChange(idx, isMultiple())}
                    disabled={isSubmitted}
                  />
                  <span className="option-text">{answer}</span>
                </label>
              );
            })}
          </div>

          {isSubmitted && (
            <div className={`results ${checkAnswer(currentIndex) ? 'correct' : 'incorrect'}`}>
              <p>
                <span className="result-label">Your Answer:</span> 
                {Array.isArray(userAnswers[currentIndex]) 
                  ? userAnswers[currentIndex]?.map(idx => getAnswerText(idx)).join(', ') 
                  : getAnswerText(userAnswers[currentIndex]) || 'No answer'}
              </p>
              <p>
                <span className="result-label">Correct Answer:</span> 
                {currentQuestion.shuffledCorrectIds?.map(idx => 
                  getAnswerText(idx)).join(', ') || 'Unknown'}
              </p>
              <p>
                <span className="result-label">Explanation:</span> 
                {currentQuestion.explanation || 'No explanation provided.'}
              </p>
              
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
            disabled={currentIndex === questions.length - 1}
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
                    handleSubmit();
                    setShowExitWarning(false);
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
                  setShowSubmitWarning(false);
                  handleSubmit();
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
  );
};

export default QuizRunner; 