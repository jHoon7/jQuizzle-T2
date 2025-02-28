import React from 'react';
import PropTypes from 'prop-types';

const ArcadeScreen = ({ onClose }) => {
  return (
    <div className="arcade-screen">
      <div className="arcade-screen-content">
        <h2>Arcade Games</h2>
        <p>Games will be implemented here.</p>
        <button className="arcade-close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

ArcadeScreen.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ArcadeScreen; 