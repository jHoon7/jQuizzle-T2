import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import coinIcon from '../assets/coin-icon.svg';
import sMutansIcon from '../assets/s-mutans-icon.svg';
import cFactorIcon from '../assets/c-factor-icon.svg';
import azithroIcon from '../assets/azithro-icon.svg';
import azithroTopIcon from '../assets/azithro-top-icon.svg';
import SMutansGame from './SMutansGame';

const ArcadeScreen = ({ onClose }) => {
  const [showTokenModal, setShowTokenModal] = useState(true);
  const [tokenCount, setTokenCount] = useState(5); // Initialize with 5 tokens
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [hoveredGame, setHoveredGame] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  
  const handleTokenModalClose = () => {
    setShowTokenModal(false);
  };
  
  const handleGameClick = (gameName) => {
    if (tokenCount > 0) {
      setSelectedGame(gameName);
      setShowConfirmation(true);
    } else {
      alert("You don't have any tokens left! Come back after studying more.");
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
        return <SMutansGame onClose={handleGameClose} />;
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
          
          <div className="token-counter">
            <span>{tokenCount}</span>
            <img src={coinIcon} alt="Token" className="token-counter-icon" />
          </div>
          
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
              className="arcade-game-coming-soon" 
              onClick={() => handleGameClick("C-Factor")}
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
              className="arcade-game-coming-soon" 
              onClick={() => handleGameClick("Azithro")}
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