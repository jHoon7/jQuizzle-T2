import { useState, useEffect, useRef } from 'react'
import '../styles/FlashcardRunner.css'

const FlashcardRunner = ({ cards, deckName, onClose, isDarkMode, onThemeToggle, onItemComplete, startSide = 'A' }) => {
  // Initialize flipped state based on startSide prop
  const getInitialFlippedState = () => {
    if (startSide === 'Random') {
      // For random mode, we'll use a consistent approach based on card index
      // This will be applied when cards are shuffled
      return false; // Default to false initially
    }
    return startSide === 'B'; // Flipped if startSide is 'B'
  };

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(getInitialFlippedState())
  const [shuffledCards, setShuffledCards] = useState([])
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(null)
  const [previewImageDimensions, setPreviewImageDimensions] = useState({ width: 0, height: 0 })
  const [cardsReviewed, setCardsReviewed] = useState(new Set())
  const [cardStatus, setCardStatus] = useState([]) // 0: not reviewed, 1: hard, 2: medium, 3: easy
  // Track which cards have been flipped at least once
  const [flippedCards, setFlippedCards] = useState(new Set())
  // Store which side each card should start on (for Random mode)
  const [cardStartSides, setCardStartSides] = useState([])
  // Track cards in learning pool (non-green cards that need more review)
  const [learningPool, setLearningPool] = useState([])
  // Track which cards have been completed (green cards)
  const [completedCards, setCompletedCards] = useState(new Set())
  // Track the next sequential index to return to after showing a learning card
  const [nextSequentialIndex, setNextSequentialIndex] = useState(0)
  // Flag to track if we're currently showing a learning card
  const [showingLearningCard, setShowingLearningCard] = useState(false)
  // Add state for toss card confirmation
  const [showTossConfirmation, setShowTossConfirmation] = useState(false)
  // Track tossed cards
  const [tossedCards, setTossedCards] = useState(new Set())
  // Track if we're in a feedback transition
  const [inFeedbackTransition, setInFeedbackTransition] = useState(false)
  
  const cardRef = useRef(null)
  // Use this ref to prevent animation when navigating
  const preventAnimationRef = useRef(false)
  // Use this ref to store the timeout
  const feedbackTimeoutRef = useRef(null)

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
    
    // For Random mode, pre-determine which side each card starts on
    if (startSide === 'Random') {
      // Generate random boolean values for each card - true means flipped (side B)
      const startSides = shuffled.map(() => Math.random() < 0.5)
      console.log('Random start sides:', startSides); // Debug log
      setCardStartSides(startSides)
      
      // Set initial card's flipped state
      if (startSides.length > 0) {
        setFlipped(startSides[0])
      }
    } else {
      // For non-random modes, still initialize cardStartSides with default values
      // This ensures the array exists even when not in Random mode
      setCardStartSides(new Array(shuffled.length).fill(startSide === 'B'))
    }
  }, [cards, startSide])
  
  // Add a class to prevent animation when navigating between cards
  useEffect(() => {
    if (preventAnimationRef.current && cardRef.current) {
      cardRef.current.classList.add('no-animation')
      
      // Remove the class after a short delay to re-enable animations for user clicks
      const timer = setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.classList.remove('no-animation')
        }
        preventAnimationRef.current = false
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [currentIndex, flipped])

  // Cleanup any pending feedback transition timeouts on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [])

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
    
    // Loop through all cards and count by status, excluding tossed cards
    shuffledCards.forEach((_, index) => {
      // Skip tossed cards
      if (tossedCards.has(index)) return;
      
      const status = cardStatus[index];
      if (status === 1) counts.dangerZone++;
      else if (status === 2) counts.gundecked++;
      else if (status === 3) counts.easyDay++;
    });
    
    return counts;
  }
  
  // Get current counts
  const categoryCounts = getCategoryCounts();

  const handleFlip = () => {
    // Only allow animation for user-initiated flips
    preventAnimationRef.current = false
    
    setFlipped(!flipped)
    
    // Mark this card as having been flipped at least once
    if (!flippedCards.has(currentIndex)) {
      setFlippedCards(prev => {
        const newFlipped = new Set(prev)
        newFlipped.add(currentIndex)
        return newFlipped
      })
    }
    
    // If this is the first time flipping this card, mark it as reviewed
    // and call onItemComplete
    if (!cardsReviewed.has(currentIndex)) {
      setCardsReviewed(prev => {
        const newReviewed = new Set(prev)
        newReviewed.add(currentIndex)
        return newReviewed
      })
      
      // Call onItemComplete when a card is flipped for the first time
      if (onItemComplete) {
        onItemComplete()
      }
    }
  }

  // Decide whether to show a learning card based on probability
  const shouldShowLearningCard = () => {
    // No cards in learning pool
    if (learningPool.length === 0) return false;
    
    // 10% chance of showing a learning card if there are any in the pool
    return Math.random() < 0.1;
  }

  // Select a card from the learning pool using weighted probability
  const selectCardFromLearningPool = () => {
    const totalWeight = learningPool.reduce((sum, item) => sum + item.weight, 0);
    let randomValue = Math.random() * totalWeight;
    
    for (const item of learningPool) {
      randomValue -= item.weight;
      if (randomValue <= 0) {
        return item.index;
      }
    }
    
    // Fallback to the first item in the learning pool
    return learningPool[0].index;
  }

  const handleNext = () => {
    // Don't allow navigation during feedback transition
    if (inFeedbackTransition) return;
    
    // Prevent animation when navigating
    preventAnimationRef.current = true;
    
    // If we're currently showing a learning card, go back to the sequential flow
    if (showingLearningCard) {
      setCurrentIndex(nextSequentialIndex);
      setShowingLearningCard(false);
    } else {
      // Save the next sequential index in case we show a learning card
      const nextIndex = currentIndex + 1;
      
      // Check if we've reached the end of the deck
      if (nextIndex >= shuffledCards.length) {
        // At the end of the deck, check if there are unseen cards
        const unseenCards = shuffledCards.findIndex((_, index) => 
          !cardsReviewed.has(index) && !isCardTossed(index)
        );
        
        if (unseenCards !== -1) {
          // If there are unseen cards, go to the first one
          setCurrentIndex(unseenCards);
        } else if (learningPool.length > 0) {
          // If all cards have been seen, but there are learning cards, show one
          const learningCardIndex = selectCardFromLearningPool();
          setCurrentIndex(learningCardIndex);
          setShowingLearningCard(true);
        } else {
          // If all cards have been seen and none are in the learning pool, stay at the end
          // This essentially does nothing, keeping the user at the last card
        }
      } else if (shouldShowLearningCard()) {
        // Not at the end of the deck, but decide if we should show a learning card
        const learningCardIndex = selectCardFromLearningPool();
        
        // Only switch to a learning card if it's different from the current one
        if (learningCardIndex !== currentIndex) {
          setNextSequentialIndex(nextIndex);
          setCurrentIndex(learningCardIndex);
          setShowingLearningCard(true);
        } else {
          // If we selected the same card, just move to the next sequential card
          setCurrentIndex(nextIndex);
        }
      } else {
        // Continue to the next sequential card
        setCurrentIndex(nextIndex);
      }
    }
    
    // Get the actual next index that we're navigating to
    const actualNextIndex = showingLearningCard 
      ? nextSequentialIndex 
      : (currentIndex + 1 >= shuffledCards.length 
          ? currentIndex // Stay at current if at end
          : currentIndex + 1);
    
    // Set the flipped state based on startSide without animation
    if (startSide === 'Random') {
      // Use the correct index for the next card
      setFlipped(cardStartSides[actualNextIndex]);
    } else {
      setFlipped(startSide === 'B');
    }
  }

  const handlePrevious = () => {
    // Don't allow navigation during feedback transition
    if (inFeedbackTransition) return;
    
    if (currentIndex > 0) {
      // Prevent animation when navigating
      preventAnimationRef.current = true
      
      // Update the index
      const prevIndex = currentIndex - 1
      setCurrentIndex(prevIndex)
      
      // Set the flipped state based on startSide without animation
      if (startSide === 'Random') {
        setFlipped(cardStartSides[prevIndex])
      } else {
        setFlipped(startSide === 'B')
      }
      
      // If we were showing a learning card, reset that state
      if (showingLearningCard) {
        setShowingLearningCard(false);
      }
    }
  }

  // Check if the current card has been flipped at least once
  const hasBeenFlipped = flippedCards.has(currentIndex);

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
    // If already in transition, ignore additional clicks
    if (inFeedbackTransition) return;
    
    // Record feedback (1: hard, 2: medium, 3: easy)
    setCardStatus(prev => {
      const newStatus = [...prev]
      newStatus[currentIndex] = difficulty
      return newStatus
    })
    
    // Handle the learning pool based on difficulty
    if (difficulty === 3) {
      // Easy card - mark as completed and remove from learning pool
      setCompletedCards(prev => {
        const newCompleted = new Set(prev)
        newCompleted.add(currentIndex)
        return newCompleted
      })
      
      // Remove from learning pool if it was there
      setLearningPool(prev => prev.filter(item => item.index !== currentIndex))
    } else {
      // Hard or medium difficulty - add to learning pool with appropriate weight
      const weight = difficulty === 1 ? 0.5 : 0.3; // Red cards now have 50% weight
      
      setLearningPool(prev => {
        // Remove this card if it's already in the pool
        const filtered = prev.filter(item => item.index !== currentIndex)
        // Then add it with the new weight
        return [...filtered, { index: currentIndex, weight }]
      })
      
      // Remove from completed if it was there
      setCompletedCards(prev => {
        const newCompleted = new Set(prev)
        newCompleted.delete(currentIndex)
        return newCompleted
      })
    }
    
    // Start the transition
    setInFeedbackTransition(true);
    
    // Enable animation for feedback
    preventAnimationRef.current = false;
    
    // First, flip the card back to front
    setFlipped(false);
    
    // Pre-calculate next card data
    let nextCardIndex;
    let nextShowingLearningCard = false;
    
    if (showingLearningCard) {
      nextCardIndex = nextSequentialIndex;
    } else {
      const nextIndex = currentIndex + 1;
      
      if (nextIndex >= shuffledCards.length) {
        const unseenCards = shuffledCards.findIndex((_, index) => 
          !cardsReviewed.has(index) && !tossedCards.has(index)
        );
        
        if (unseenCards !== -1) {
          nextCardIndex = unseenCards;
        } else if (learningPool.length > 0) {
          nextCardIndex = selectCardFromLearningPool();
          nextShowingLearningCard = true;
        } else {
          // Stay on current card if at end of deck
          nextCardIndex = currentIndex;
        }
      } else if (shouldShowLearningCard()) {
        const learningCardIndex = selectCardFromLearningPool();
        
        if (learningCardIndex !== currentIndex) {
          nextCardIndex = learningCardIndex;
          nextShowingLearningCard = true;
        } else {
          nextCardIndex = nextIndex;
        }
      } else {
        nextCardIndex = nextIndex;
      }
    }
    
    // Allow time for the flip animation before changing cards
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    feedbackTimeoutRef.current = setTimeout(() => {
      // Update the card index
      setCurrentIndex(nextCardIndex);
      setShowingLearningCard(nextShowingLearningCard);
      
      // Reset the flipped state based on the startSide
      if (startSide === 'Random') {
        setFlipped(cardStartSides[nextCardIndex]);
      } else {
        setFlipped(startSide === 'B');
      }
      
      // IMPORTANT: Clear the transition state to re-enable navigation
      setInFeedbackTransition(false);
      
      // Clear the timeout reference
      feedbackTimeoutRef.current = null;
    }, 600); // 600ms matches CSS transition duration
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

  const handleCardSelect = (index) => {
    // Prevent animation when directly selecting a card
    preventAnimationRef.current = true
    
    setCurrentIndex(index)
    
    // Set flipped state based on startSide without animation
    if (startSide === 'Random') {
      setFlipped(cardStartSides[index])
    } else {
      setFlipped(startSide === 'B')
    }
    
    // Reset the learning card state if we directly select a card
    setShowingLearningCard(false);
  }

  // Calculate percentage of completed cards (green cards)
  const getCompletionPercentage = () => {
    if (shuffledCards.length === 0) return 0;
    // Adjust calculation to only consider non-tossed cards
    const totalVisibleCards = visibleCardCount;
    return totalVisibleCards > 0 ? (completedCards.size / totalVisibleCards) * 100 : 0;
  }

  // Handle toss card request
  const handleTossCardRequest = (e) => {
    e.stopPropagation();
    setShowTossConfirmation(true);
  }

  // Confirm toss card
  const confirmTossCard = () => {
    // Add current card to tossed set
    setTossedCards(prev => {
      const newTossed = new Set(prev);
      newTossed.add(currentIndex);
      return newTossed;
    });

    // Remove from learning pool if it exists there
    setLearningPool(prev => prev.filter(item => item.index !== currentIndex));
    
    // Remove from completed cards if it exists there
    setCompletedCards(prev => {
      const newCompleted = new Set(prev);
      newCompleted.delete(currentIndex);
      return newCompleted;
    });

    // Close the confirmation dialog
    setShowTossConfirmation(false);
    
    // Move to the next card
    handleNext();
  }

  // Cancel toss card
  const cancelTossCard = () => {
    setShowTossConfirmation(false);
  }

  // Check if card is tossed
  const isCardTossed = (index) => {
    return tossedCards.has(index);
  }

  // Get the visible cards (non-tossed cards)
  const getVisibleCards = () => {
    return shuffledCards.filter((_, index) => !isCardTossed(index));
  }

  // Get the adjusted card number for display (accounting for tossed cards)
  const getDisplayCardNumber = (index) => {
    if (isCardTossed(index)) return null;
    
    // Count how many non-tossed cards come before this one
    let displayNumber = 1; // Start at 1 for 1-based indexing
    for (let i = 0; i < index; i++) {
      if (!isCardTossed(i)) {
        displayNumber++;
      }
    }
    return displayNumber;
  }

  // Get the current card's display number
  const currentDisplayNumber = getDisplayCardNumber(currentIndex);
  
  // Get total number of visible cards
  const visibleCardCount = getVisibleCards().length;

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
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {completedCards.size} / {visibleCardCount} Cards Completed
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
          {shuffledCards.map((_, index) => {
            // Only render non-tossed cards
            if (isCardTossed(index)) return null;
            
            // Get the display number for this card
            const displayNumber = getDisplayCardNumber(index);
            
            return (
              <button
                key={index}
                className={`card-number ${getCardStatus(index)} ${index === currentIndex ? 'current' : ''}`}
                onClick={() => handleCardSelect(index)}
              >
                {displayNumber}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flashcard-content">
        <div className="top-controls">
          <div className="deck-info">
            <h2 className="deck-name">{deckName}</h2>
            <div className="card-count">
              Card {currentDisplayNumber} of {visibleCardCount}
              <span className="side-indicator">
                {flipped ? 'Side B' : 'Side A'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Add the side navigation container */}
        <div className="side-navigation">
          {/* Jettison button above Previous button - always visible */}
          <button
            className="jettison-button"
            onClick={handleTossCardRequest}
            title="Jettison this card"
          >
            ⚓ Jettison
          </button>
          
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
                  <p className="flashcard-text">
                    {inFeedbackTransition 
                      ? '' // Show blank content during transition
                      : currentCard.side1}
                  </p>
                  {/* Display front side images if they exist and not in transition */}
                  {!inFeedbackTransition && renderImages(currentCard.side1Images)}
                </div>
              </div>
              <div className="flashcard-back">
                <div className="flashcard-content-wrapper">
                  <p className="flashcard-text">
                    {inFeedbackTransition 
                      ? '' // Show blank content during transition
                      : currentCard.side2}
                  </p>
                  {/* Display back side images if they exist and not in transition */}
                  {!inFeedbackTransition && renderImages(currentCard.side2Images)}
                </div>
                {/* Show feedback buttons only on back side if the card has been flipped before */}
                {hasBeenFlipped && !inFeedbackTransition && (
                  <div className="flashcard-feedback">
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
                )}
              </div>
            </div>
          </div>
          
          {/* Next button on the right */}
          <button
            className="side-nav-button next-button"
            onClick={handleNext}
            disabled={currentIndex === shuffledCards.length - 1 && !showingLearningCard}
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

      {/* Toss Card Confirmation Modal */}
      {showTossConfirmation && (
        <div className="warning-modal-overlay">
          <div className="warning-modal">
            <h3>Toss this card overboard!</h3>
            <div className="warning-buttons">
              <button onClick={cancelTossCard}>
                Cancel
              </button>
              <button className="danger" onClick={confirmTossCard}>
                Affirmative
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