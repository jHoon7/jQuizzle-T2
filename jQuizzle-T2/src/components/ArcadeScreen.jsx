import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import coinIcon from '../assets/coin-icon.svg';
import sMutansIcon from '../assets/s-mutans-icon.svg';
import cFactorIcon from '../assets/c-factor-icon.svg';
import azithroIcon from '../assets/azithro-icon.svg';
import azithroTopIcon from '../assets/azithro-top-icon.svg';
import SMutansGame from './SMutansGame';

const ArcadeScreen = ({ onClose }) => {
  // Check if this is the first arcade visit
  const [showTokenModal, setShowTokenModal] = useState(() => {
    return localStorage.getItem('hasVisitedArcade') !== 'true';
  });
  
  // Initialize token count from localStorage or default to 5 if first visit
  const [tokenCount, setTokenCount] = useState(() => {
    if (localStorage.getItem('hasVisitedArcade') !== 'true') {
      return 5; // First time visitors get 5 tokens
    } else {
      return parseInt(localStorage.getItem('arcadeTokens') || '0');
    }
  });
  
  // Initialize the question/card counter
  const [questionCounter, setQuestionCounter] = useState(() => {
    return parseInt(localStorage.getItem('arcadeQuestionCounter') || '0');
  });
  
  // Add state for warning message
  const [showWarning, setShowWarning] = useState(false);
  const [warningTimeout, setWarningTimeout] = useState(null);
  
  // Add state to track hovering over token counter
  const [isHoveringTokenCounter, setIsHoveringTokenCounter] = useState(false);
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [hoveredGame, setHoveredGame] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  
  // Add a new state for the coming soon message
  const [showComingSoonMessage, setShowComingSoonMessage] = useState(false);
  const [comingSoonTimeout, setComingSoonTimeout] = useState(null);
  
  // Update localStorage when tokens or counter changes
  useEffect(() => {
    localStorage.setItem('arcadeTokens', tokenCount.toString());
  }, [tokenCount]);
  
  useEffect(() => {
    localStorage.setItem('arcadeQuestionCounter', questionCounter.toString());
  }, [questionCounter]);
  
  // Clear warning timeout on unmount
  useEffect(() => {
    return () => {
      if (warningTimeout) {
        clearTimeout(warningTimeout);
      }
    };
  }, [warningTimeout]);
  
  // Add useEffect to clear comingSoon timeout
  useEffect(() => {
    return () => {
      if (comingSoonTimeout) {
        clearTimeout(comingSoonTimeout);
      }
    };
  }, [comingSoonTimeout]);
  
  const handleTokenModalClose = () => {
    setShowTokenModal(false);
    // Mark that the user has visited the arcade
    localStorage.setItem('hasVisitedArcade', 'true');
  };
  
  // Add a new handler for coming soon games
  const handleComingSoonClick = () => {
    // Show coming soon message
    setShowComingSoonMessage(true);
    
    // Clear any existing timeout
    if (comingSoonTimeout) {
      clearTimeout(comingSoonTimeout);
    }
    
    // Auto-hide the message after 3 seconds
    const timeout = setTimeout(() => {
      setShowComingSoonMessage(false);
    }, 3000);
    
    setComingSoonTimeout(timeout);
  };
  
  const handleGameClick = (gameName) => {
    if (tokenCount > 0) {
      setSelectedGame(gameName);
      setShowConfirmation(true);
    } else {
      // Show internal warning message instead of alert
      setShowWarning(true);
      
      // Clear any existing timeout
      if (warningTimeout) {
        clearTimeout(warningTimeout);
      }
      
      // Auto-hide the warning after 3 seconds
      const timeout = setTimeout(() => {
        setShowWarning(false);
      }, 3000);
      
      setWarningTimeout(timeout);
    }
  };
  
  const handleConfirmPlay = () => {
    // Deduct token and start the game
    setTokenCount(prevCount => prevCount - 1);
    setShowConfirmation(false);
    setActiveGame(selectedGame);
  };
  
  const handleCancelPlay = () => {
    setShowConfirmation(false);
    setSelectedGame(null);
  };

  const handleGameClose = () => {
    setActiveGame(null);
  };
  
  // Render the active game
  const renderGame = () => {
    switch (activeGame) {
      case "S. mutans":
        return <SMutansGame 
          onClose={handleGameClose} 
          tokenCount={tokenCount} 
          onTokenUse={(amount = 1) => setTokenCount(prevCount => prevCount - amount)} 
        />;
      case "C-Factor":
        return <div className="game-placeholder">C-Factor game coming soon!</div>;
      case "Azithro":
        return <div className="game-placeholder">Azithro game coming soon!</div>;
      default:
        return null;
    }
  };
  
  // If a game is active, render it instead of the arcade screen
  if (activeGame) {
    return renderGame();
  }
  
  return (
    <div className="arcade-screen">
      {showTokenModal ? (
        <div className="token-modal-overlay">
          <div className="token-modal">
            <div className="token-modal-content">
              <div className="token-message">
                <img src={coinIcon} alt="Coin" className="coin-icon" />
                <div className="token-message-text">
                  <p>You've earned 5 tokens!</p>
                  <p>Use them wisely! =P</p>
                </div>
                <img src={coinIcon} alt="Coin" className="coin-icon" />
              </div>
              <button className="token-modal-button" onClick={handleTokenModalClose}>
                Continue to Arcade
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="arcade-screen-content">
          {showConfirmation && (
            <div className="confirmation-modal-overlay">
              <div className="confirmation-modal">
                <h3>Play {selectedGame}?</h3>
                <p>Would you like to use 1 token to play this game?</p>
                <div className="confirmation-buttons">
                  <button className="confirm-button" onClick={handleConfirmPlay}>Aye!</button>
                  <button className="cancel-button" onClick={handleCancelPlay}>Belay My Last</button>
                </div>
              </div>
            </div>
          )}
          
          <div className="counter-container">
            <div 
              className={`token-counter ${tokenCount === 0 ? 'disabled' : ''}`}
              onMouseEnter={() => setIsHoveringTokenCounter(true)}
              onMouseLeave={() => setIsHoveringTokenCounter(false)}
            >
              <span>{tokenCount}</span>
              <img src={coinIcon} alt="Token" className="token-counter-icon" />
            </div>
          </div>
          
          {tokenCount === 0 && isHoveringTokenCounter && (
            <div className="token-counter-message pulsate">
              Complete more questions/cards to earn more tokens!
            </div>
          )}
          
          {showWarning && (
            <div className="arcade-warning-message pulsate">
              You don't have any tokens left! Complete more questions/cards to earn tokens.
            </div>
          )}
          
          {showComingSoonMessage && (
            <div className="arcade-warning-message pulsate">
              This game is coming soon! Check back later for updates.
            </div>
          )}
          
          <h2>Game Galley</h2>
          <p>You've earned a study break! Each play will cost you 1 hard earned token!</p>
          
          <div className="arcade-games-placeholder">
            <div 
              className="arcade-game" 
              onClick={() => handleGameClick("S. mutans")}
              onMouseEnter={() => setHoveredGame("S. mutans")}
              onMouseLeave={() => setHoveredGame(null)}
            >
              <div className="game-content">
                <div className="game-icon">
                  <img src={sMutansIcon} alt="S. mutans icon" className="game-icon-svg" />
                </div>
                <h3>S. mutans!</h3>
                <div className="description-space">
                  {hoveredGame === "S. mutans" && (
                    <p>Help the little cocci grow to become the extracellular polymeric substance it was always meant to be!</p>
                  )}
                </div>
              </div>
            </div>
            
            <div 
              className="arcade-game-coming-soon greyed-out" 
              onClick={handleComingSoonClick}
              onMouseEnter={() => setHoveredGame("C-Factor")}
              onMouseLeave={() => setHoveredGame(null)}
            >
              <div className="game-content">
                <div className="game-icon">
                  <img src={cFactorIcon} alt="C-Factor icon" className="game-icon-svg" />
                </div>
                <h3>C-Factor!</h3>
                <div className="description-space">
                  {hoveredGame === "C-Factor" && (
                    <p>Fight polymerization shrinkage one wall at a time!</p>
                  )}
                </div>
              </div>
            </div>
            
            <div 
              className="arcade-game-coming-soon greyed-out" 
              onClick={handleComingSoonClick}
              onMouseEnter={() => setHoveredGame("Azithro")}
              onMouseLeave={() => setHoveredGame(null)}
            >
              <div className="game-content">
                <div className="game-icon">
                  <img src={azithroTopIcon} alt="Azithro top icon" className="game-icon-svg azithro-top-icon" />
                  <img src={azithroIcon} alt="Azithro icon" className="game-icon-svg azithro-icon" />
                </div>
                <h3>Azithro!</h3>
                <div className="description-space">
                  {hoveredGame === "Azithro" && (
                    <p>Seduced by a cute infection, Azithro's cyster has been captured and walled away. Most would take the path of least resistance and give up, but you are no ordinary macrolide...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <button className="arcade-close-button" onClick={onClose}>
            Back to work shipmate...
          </button>
        </div>
      )}
    </div>
  );
};

ArcadeScreen.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ArcadeScreen; 