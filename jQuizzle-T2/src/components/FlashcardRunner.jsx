import { useState, useEffect, useRef } from 'react'
import '../styles/FlashcardRunner.css'

const FlashcardRunner = ({ cards, deckName, onClose, isDarkMode, onThemeToggle }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffledCards, setShuffledCards] = useState([])
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(null)
  const [previewImageDimensions, setPreviewImageDimensions] = useState({ width: 0, height: 0 })
  const [cardsReviewed, setCardsReviewed] = useState(new Set())
  const [cardStatus, setCardStatus] = useState([]) // 0: not reviewed, 1: hard, 2: medium, 3: easy
  
  const cardRef = useRef(null)

  // Shuffle cards on component mount
  useEffect(() => {
    // Create a copy of the cards array and shuffle it
    const shuffled = [...cards]
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    setShuffledCards(shuffled)
    
    // Initialize card status
    setCardStatus(new Array(shuffled.length).fill(0))
  }, [cards])

  // Wait for shuffling to complete before rendering
  if (shuffledCards.length === 0) {
    return null
  }

  const currentCard = shuffledCards[currentIndex] || {}

  // Calculate category counts from cardStatus array
  const getCategoryCounts = () => {
    const counts = {
      dangerZone: 0,
      gundecked: 0,
      easyDay: 0
    }
    
    cardStatus.forEach(status => {
      if (status === 1) counts.dangerZone++
      else if (status === 2) counts.gundecked++
      else if (status === 3) counts.easyDay++
    })
    
    return counts
  }
  
  // Get current counts
  const categoryCounts = getCategoryCounts()

  const handleFlip = () => {
    // Record that this card has been reviewed
    setCardsReviewed(prev => {
      const newSet = new Set(prev)
      newSet.add(currentIndex)
      return newSet
    })
    setFlipped(!flipped)
  }

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setFlipped(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setFlipped(false)
    }
  }

  const handleExitClick = () => {
    setShowExitWarning(true)
  }

  const getCardStatus = (index) => {
    // First check if the card has a specific status assigned
    const status = cardStatus[index]
    
    if (status === 1) return 'danger-zone' // Red - Danger Zone
    if (status === 2) return 'gundecked' // Yellow - Gundecked
    if (status === 3) return 'easy-day' // Green - Easy Day
    
    // Fall back to the reviewed/not-reviewed status
    const isReviewed = cardsReviewed.has(index)
    return isReviewed ? 'reviewed' : 'not-reviewed'
  }

  const handleFeedback = (difficulty) => {
    // Record feedback (1: hard, 2: medium, 3: easy)
    setCardStatus(prev => {
      const newStatus = [...prev]
      newStatus[currentIndex] = difficulty
      return newStatus
    })
    
    // Auto-advance to next card
    if (currentIndex < shuffledCards.length - 1) {
      setTimeout(() => {
        handleNext()
      }, 300)
    }
  }

  const handleImageClick = (e, image) => {
    // Stop the click event from bubbling up to the parent card
    e.stopPropagation();
    
    setShowImagePreview(image);
    
    // Get the natural dimensions of the image
    const img = new Image();
    img.onload = () => {
      setPreviewImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.src = image;
  };

  const closeImagePreview = () => {
    setShowImagePreview(null)
  }

  // Render image thumbnails with hover functionality
  const renderImages = (images) => {
    if (!images || !Array.isArray(images) || images.length === 0) return null
    
    return (
      <div className="flashcard-images-container">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="flashcard-image-thumbnail-container"
            onClick={(e) => handleImageClick(e, image)}
            title="Click to enlarge"
          >
            <img 
              src={image} 
              alt={`Image ${index + 1}`} 
              className="flashcard-image-thumbnail"
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`flashcard-runner ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Left panel - Card navigation */}
      <div className="card-nav">
        <div className="nav-header">
          <button 
            className="exit-button"
            onClick={handleExitClick}
          >
            Exit Deck
          </button>
        </div>
        <div className="card-progress">
          <div className="progress-bar">
            <div 
              className="progress-filled" 
              style={{ width: `${(cardsReviewed.size / shuffledCards.length) * 100}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {cardsReviewed.size} / {shuffledCards.length} cards
          </div>
        </div>
        
        {/* Add category counters */}
        <div className="category-counters">
          <div className="counter danger-counter">
            <div className="counter-label">Danger Zone:</div>
            <div className="counter-value">{categoryCounts.dangerZone}</div>
          </div>
          <div className="counter yellow-counter">
            <div className="counter-label">Gundecked:</div>
            <div className="counter-value">{categoryCounts.gundecked}</div>
          </div>
          <div className="counter success-counter">
            <div className="counter-label">Easy Day:</div>
            <div className="counter-value">{categoryCounts.easyDay}</div>
          </div>
        </div>
        
        <div className="card-grid">
          {shuffledCards.map((_, index) => (
            <button
              key={index}
              className={`card-number ${getCardStatus(index)} ${index === currentIndex ? 'current' : ''}`}
              onClick={() => {
                setCurrentIndex(index)
                setFlipped(false)
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flashcard-content">
        <div className="top-controls">
          <div className="deck-info">
            <h2 className="deck-name">{deckName}</h2>
            <div className="card-count">
              Card {currentIndex + 1} of {shuffledCards.length}
            </div>
          </div>
        </div>
        
        {/* Add the side navigation container */}
        <div className="side-navigation">
          {/* Previous button on the left */}
          <button
            className="side-nav-button prev-button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            &#10094; {/* Left arrow character */}
          </button>
          
          {/* Flashcard in the middle */}
          <div 
            className={`flashcard-container ${flipped ? 'flipped' : ''}`}
            onClick={handleFlip}
            ref={cardRef}
          >
            <div className="flashcard-inner">
              <div className="flashcard-front">
                <div className="flashcard-content-wrapper">
                  <p className="flashcard-text">{currentCard.side1}</p>
                  {/* Display front side images if they exist */}
                  {renderImages(currentCard.side1Images)}
                </div>
                <div className="flashcard-instructions">Click to flip</div>
              </div>
              <div className="flashcard-back">
                <div className="flashcard-content-wrapper">
                  <p className="flashcard-text">{currentCard.side2}</p>
                  {/* Display back side images if they exist */}
                  {renderImages(currentCard.side2Images)}
                </div>
                <div className="flashcard-feedback">
                  <p>How well did you know this?</p>
                  <div className="feedback-buttons">
                    <button 
                      className="feedback-button danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback(1);
                      }}
                    >
                      Danger Zone
                    </button>
                    <button 
                      className="feedback-button yellow"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback(2);
                      }}
                    >
                      Gundecked...
                    </button>
                    <button 
                      className="feedback-button green"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback(3);
                      }}
                    >
                      Easy Day!
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Next button on the right */}
          <button
            className="side-nav-button next-button"
            onClick={handleNext}
            disabled={currentIndex === shuffledCards.length - 1}
          >
            &#10095; {/* Right arrow character */}
          </button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {showImagePreview && (
        <div 
          className="flashcard-image-preview-overlay"
          onClick={closeImagePreview}
        >
          <div className="flashcard-image-preview-container">
            <img 
              src={showImagePreview} 
              alt="Preview" 
              className="flashcard-image-preview"
            />
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showExitWarning && (
        <div className="warning-modal-overlay">
          <div className="warning-modal">
            <h3>Exit Flashcard Deck?</h3>
            <p>Are you sure you want to exit this deck?</p>
            <div className="warning-buttons">
              <button onClick={() => setShowExitWarning(false)}>
                Continue Review
              </button>
              <button className="danger" onClick={onClose}>
                Exit Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme toggle button */}
      <button 
        className="theme-toggle-button"
        onClick={onThemeToggle}
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? "☀️" : "🌙"}
      </button>
    </div>
  )
}

export default FlashcardRunner 