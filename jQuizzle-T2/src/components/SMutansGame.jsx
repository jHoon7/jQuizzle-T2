import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../styles/SMutansGame.css';

const SMutansGame = ({ onClose }) => {
  // Canvas dimensions - make it square for better controls
  const canvasWidth = 600;
  const canvasHeight = 600;
  
  // Game state
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [boostEnergy, setBoostEnergy] = useState(100); // Boost energy (0-100)
  const [useMouseControls, setUseMouseControls] = useState(true); // Toggle for mouse/keyboard controls
  const [gameState, setGameState] = useState('playing'); // Changed default to 'playing'
  
  // Game world dimensions
  const worldWidth = 3000;
  const worldHeight = 3000;
  
  // Refs
  const canvasRef = useRef(null);
  const playerRef = useRef({
    body: [{ x: worldWidth / 2, y: worldHeight / 2 }],
    direction: { x: 1, y: 0 }, // Set initial direction
    speed: 2,
    normalSpeed: 2,
    boostSpeed: 4,
    size: 20,
    color: '#5D8AA8', // Blue color for bacteria
    growing: false,
    boosting: false,
    boostTime: 0,
    maxBoostTime: 1000, // 1 second max boost time (reduced from 2 seconds)
    growthCounter: 0,
    growthThreshold: 3,
    segmentSpacing: 1.5 // Adjusted spacing factor for more even appearance
  });
  const cameraRef = useRef({
    x: worldWidth / 2 - canvasWidth / 2,
    y: worldHeight / 2 - canvasHeight / 2
  });
  const foodRef = useRef([]);
  const lastTimeRef = useRef(0);
  const mousePositionRef = useRef({ x: canvasWidth / 2, y: canvasHeight / 2 });
  const mouseDownRef = useRef(false);
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
  });
  const animationFrameRef = useRef(null);
  const enemiesRef = useRef([]);
  const particlesRef = useRef([]);
  
  // Initialize the game
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Generate initial food
    generateFood(50); // Adjusted for original canvas size
    
    // Generate initial enemy snakes
    generateEnemies(5); // Start with 5 enemy snakes
    
    // Start the game loop
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Add click handler for game state transitions
    const handleClick = () => {
      if (gameState === 'start') {
        setGameState('playing');
      } else if (gameState === 'gameover') {
        resetGame();
        setGameState('playing');
      }
    };
    
    canvas.addEventListener('click', handleClick);
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
    };
  }, [gameState]); // Add gameState dependency for the effect
  
  // Particle class (outside of render function)
  class Particle {
    constructor(x, y, color, size = 2) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.size = Math.random() * size + 1;
      this.dx = (Math.random() - 0.5) * 4;
      this.dy = (Math.random() - 0.5) * 4;
      this.alpha = 1;
      this.decay = 0.01 + Math.random() * 0.03; // Random decay rate
    }
    
    update() {
      this.x += this.dx;
      this.y += this.dy;
      this.alpha -= this.decay;
      this.dx *= 0.98; // Slow down over time
      this.dy *= 0.98;
    }
    
    draw(ctx, camera) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x - camera.x, this.y - camera.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }
  }
  
  // Generate enemy snakes
  const generateEnemies = (count) => {
    const newEnemies = [];
    const enemyColors = ['#FF6B6B', '#FFD166', '#06D6A0', '#118AB2', '#9775FA'];
    
    for (let i = 0; i < count; i++) {
      // Random starting position away from player
      let x, y;
      do {
        x = Math.random() * worldWidth;
        y = Math.random() * worldHeight;
      } while (
        Math.sqrt(
          Math.pow(x - playerRef.current.body[0].x, 2) + 
          Math.pow(y - playerRef.current.body[0].y, 2)
        ) < 500 // Keep enemies at least 500px away from player initially
      );
      
      // Create enemy snake with random properties
      const enemySize = 15 + Math.random() * 10; // Size between 15-25
      const enemySpeed = 1 + Math.random(); // Speed between 1-2
      const enemyColor = enemyColors[Math.floor(Math.random() * enemyColors.length)];
      const initialSegments = Math.floor(Math.random() * 8) + 5; // 5-12 initial segments
      
      // Create enemy body with multiple segments and varying positions
      const enemyBody = [];
      let prevX = x;
      let prevY = y;
      
      // Random initial direction
      const angle = Math.random() * Math.PI * 2;
      const direction = {
        x: Math.cos(angle),
        y: Math.sin(angle)
      };
      
      // Add segments with slight position variations to create a snake-like appearance
      for (let j = 0; j < initialSegments; j++) {
        enemyBody.push({ 
          x: prevX - direction.x * (enemySize * 1.8) * j, // Adjusted spacing
          y: prevY - direction.y * (enemySize * 1.8) * j, // Adjusted spacing
        });
      }
      
      newEnemies.push({
        body: enemyBody,
        direction,
        speed: enemySpeed,
        size: enemySize,
        color: enemyColor,
        growing: false,
        turnSpeed: 0.02 + Math.random() * 0.04, // Random turn speed
        thinkTime: 0,
        thinkInterval: 1000 + Math.random() * 2000, // Change direction every 1-3 seconds
        targetDirection: { ...direction }, // Initial target is current direction
        spikes: Math.floor(Math.random() * 3) + 4, // Random number of spikes (4-6)
        segmentSpacing: 1.8, // Adjusted spacing factor for better appearance
        // Add new properties for improved AI
        aggressionThreshold: Math.floor(Math.random() * 5) + 3, // How many segments player needs to be worth chasing
        intelligence: Math.random(), // 0-1, affects decision making
        huntPlayer: false, // Whether currently hunting player
        huntCooldown: 0, // Cooldown before hunting player again
        sightRange: 300 + Math.random() * 200 // How far enemy can "see"
      });
    }
    
    enemiesRef.current = [...enemiesRef.current, ...newEnemies];
  };
  
  // Generate food items
  const generateFood = (count) => {
    const newFood = [];
    for (let i = 0; i < count; i++) {
      newFood.push({
        x: Math.random() * worldWidth,
        y: Math.random() * worldHeight,
        size: Math.random() * 5 + 5, // Random size between 5 and 10
        color: getRandomFoodColor(),
        spikes: Math.floor(Math.random() * 5) + 3, // Random number of spikes (3-7)
        rotation: Math.random() * Math.PI * 2 // Random rotation
      });
    }
    foodRef.current = [...foodRef.current, ...newFood];
  };
  
  // Get random food color (different bacteria types)
  const getRandomFoodColor = () => {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#FFD166', // Yellow
      '#06D6A0', // Green
      '#118AB2'  // Blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Handle mouse movement
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    mousePositionRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };
  
  // Handle mouse down
  const handleMouseDown = () => {
    mouseDownRef.current = true;
  };
  
  // Handle mouse up
  const handleMouseUp = () => {
    mouseDownRef.current = false;
  };
  
  // Handle key down events
  const handleKeyDown = (e) => {
    const keys = keysRef.current;
    if (e.key === 'w' || e.key === 'W') keys.w = true;
    if (e.key === 'a' || e.key === 'A') keys.a = true;
    if (e.key === 's' || e.key === 'S') keys.s = true;
    if (e.key === 'd' || e.key === 'D') keys.d = true;
    if (e.key === ' ') keys.space = true;
  };
  
  // Handle key up events
  const handleKeyUp = (e) => {
    const keys = keysRef.current;
    if (e.key === 'w' || e.key === 'W') keys.w = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 's' || e.key === 'S') keys.s = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
    if (e.key === ' ') keys.space = false;
  };
  
  // Main game loop
  const gameLoop = (timestamp) => {
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    
    // Only update game logic if in 'playing' state and not game over
    if (gameState === 'playing' && !gameOver) {
      update(deltaTime);
    }
    
    render();
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };
  
  // Update game state
  const update = (deltaTime) => {
    const player = playerRef.current;
    const head = { ...player.body[0] };
    
    // Handle boost (mouse down or space key)
    const isBoosting = (mouseDownRef.current || keysRef.current.space) && boostEnergy > 0;
    
    if (isBoosting) {
      player.boosting = true;
      player.speed = player.boostSpeed;
      
      // Drain boost energy
      setBoostEnergy(prev => Math.max(0, prev - deltaTime / 20));
    } else {
      player.boosting = false;
      player.speed = player.normalSpeed;
      
      // Regenerate boost energy
      if (boostEnergy < 100) {
        setBoostEnergy(prev => Math.min(100, prev + deltaTime / 100));
      }
    }
    
    // Handle movement based on control mode
    const keys = keysRef.current;
    let dirX = 0;
    let dirY = 0;
    
    if (!useMouseControls) {
      // Keyboard controls
      if (keys.w) dirY -= 1;
      if (keys.s) dirY += 1;
      if (keys.a) dirX -= 1;
      if (keys.d) dirX += 1;
      
      if (dirX !== 0 || dirY !== 0) {
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        player.direction = {
          x: dirX / length,
          y: dirY / length
        };
      }
    } else {
      // Mouse controls
      const mousePos = mousePositionRef.current;
      const dx = mousePos.x - canvasWidth / 2;
      const dy = mousePos.y - canvasHeight / 2;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        player.direction = {
          x: dx / length,
          y: dy / length
        };
      }
    }
    
    // Move the player
    const newHead = {
      x: head.x + player.direction.x * player.speed,
      y: head.y + player.direction.y * player.speed
    };
    
    // Wrap around the world
    if (newHead.x < 0) newHead.x = worldWidth;
    if (newHead.x > worldWidth) newHead.x = 0;
    if (newHead.y < 0) newHead.y = worldHeight;
    if (newHead.y > worldHeight) newHead.y = 0;
    
    // Update player body
    const newBody = [newHead];
    
    // Add segments with consistent spacing
    let prevX = newHead.x;
    let prevY = newHead.y;
    
    for (let i = 0; i < player.body.length - 1; i++) {
      const dx = player.body[i].x - prevX;
      const dy = player.body[i].y - prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const targetDist = player.size * player.segmentSpacing;
        const ratio = targetDist / dist;
        
        const newX = prevX + dx * ratio;
        const newY = prevY + dy * ratio;
        
        newBody.push({ x: newX, y: newY });
        
        prevX = newX;
        prevY = newY;
      }
    }
    
    player.body = newBody;
    
    // Update camera to follow player
    cameraRef.current = {
      x: newHead.x - canvasWidth / 2,
      y: newHead.y - canvasHeight / 2
    };
    
    // Check for collisions with food
    const food = foodRef.current;
    for (let i = 0; i < food.length; i++) {
      const distance = Math.sqrt(
        Math.pow(newHead.x - food[i].x, 2) + 
        Math.pow(newHead.y - food[i].y, 2)
      );
      
      if (distance < player.size + food[i].size) {
        // Add particles
        for (let j = 0; j < 10; j++) {
          particlesRef.current.push(new Particle(food[i].x, food[i].y, food[i].color, 3));
        }
        
        // Remove food and add score
        food.splice(i, 1);
        setScore(prev => prev + 10);
        
        // Grow player
        player.body.push({ ...player.body[player.body.length - 1] });
        
        // Add new food
        generateFood(1);
        break;
      }
    }
    
    // Update particles
    particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
    particlesRef.current.forEach(p => p.update());
  };
  
  // Render the game
  const render = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const camera = cameraRef.current;
    const player = playerRef.current;
    
    // Clear the canvas
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw grid
    ctx.strokeStyle = '#1E1E1E';
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    for (let x = -camera.x % gridSize; x < canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    
    for (let y = -camera.y % gridSize; y < canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
    
    // Draw food
    const food = foodRef.current;
    food.forEach(item => {
      const screenX = item.x - camera.x;
      const screenY = item.y - camera.y;
      
      if (
        screenX + item.size >= 0 &&
        screenX - item.size <= canvasWidth &&
        screenY + item.size >= 0 &&
        screenY - item.size <= canvasHeight
      ) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, item.size, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
      }
    });
    
    // Draw boost effects if boosting
    if (player.boosting) {
      const head = player.body[0];
      const screenX = head.x - camera.x;
      const screenY = head.y - camera.y;
      
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(
        screenX, screenY, player.size,
        screenX, screenY, player.size * 2
      );
      gradient.addColorStop(0, 'rgba(78, 205, 196, 0.6)');
      gradient.addColorStop(1, 'rgba(78, 205, 196, 0)');
      ctx.fillStyle = gradient;
      ctx.arc(screenX, screenY, player.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw player snake
    player.body.forEach((segment, index) => {
      const screenX = segment.x - camera.x;
      const screenY = segment.y - camera.y;
      
      // Draw segment
      ctx.beginPath();
      ctx.arc(screenX, screenY, player.size, 0, Math.PI * 2);
      
      // Create gradient for 3D effect
      const gradient = ctx.createRadialGradient(
        screenX - player.size * 0.3,
        screenY - player.size * 0.3,
        0,
        screenX,
        screenY,
        player.size
      );
      
      if (index === 0) {
        // Head segment
        gradient.addColorStop(0, '#7BE495');
        gradient.addColorStop(1, '#4ECDC4');
      } else {
        // Body segments
        gradient.addColorStop(0, '#5D8AA8');
        gradient.addColorStop(1, '#4682B4');
      }
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add highlight
      ctx.beginPath();
      ctx.arc(
        screenX - player.size * 0.2,
        screenY - player.size * 0.2,
        player.size * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
    });
    
    // Draw particles
    particlesRef.current.forEach(particle => {
      ctx.beginPath();
      ctx.arc(
        particle.x - camera.x,
        particle.y - camera.y,
        particle.size,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(${hexToRgb(particle.color)}, ${particle.alpha})`;
      ctx.fill();
    });
    
    // Draw score
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 30);
    
    // Draw boost energy bar
    const barWidth = 200;
    const barHeight = 10;
    const barX = 20;
    const barY = 50;
    
    // Bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Energy level
    const energyWidth = (boostEnergy / 100) * barWidth;
    ctx.fillStyle = '#4ECDC4';
    if (energyWidth > 0) {
      ctx.fillRect(barX, barY, energyWidth, barHeight);
    }
  };
  
  // Helper function to convert hex to rgb
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
      '255, 255, 255';
  };
  
  // Reset the game
  const resetGame = () => {
    playerRef.current = {
      body: [{ x: worldWidth / 2, y: worldHeight / 2 }],
      direction: { x: 1, y: 0 },
      speed: 2,
      normalSpeed: 2,
      boostSpeed: 4,
      size: 20,
      color: '#5D8AA8',
      growing: false,
      boosting: false,
      boostTime: 0,
      maxBoostTime: 1000, // 1 second max boost time
      growthCounter: 0,
      growthThreshold: 3,
      segmentSpacing: 1.5 // Adjusted spacing factor
    };
    cameraRef.current = {
      x: worldWidth / 2 - canvasWidth / 2,
      y: worldHeight / 2 - canvasHeight / 2
    };
    foodRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    generateFood(50);
    generateEnemies(5);
    setScore(0);
    setBoostEnergy(100);
    setGameOver(false);
  };
  
  // Toggle control method
  const toggleControls = () => {
    setUseMouseControls(prev => !prev);
  };
  
  return (
    <div className="s-mutans-game">
      <div className="game-layout">
        <div className="controls-panel">
          <button className="exit-button" onClick={onClose}>Exit</button>
          <div className="controls-legend">
            <h3>Controls</h3>
            <p>WASD or Mouse: Move</p>
            <p>Space or Click: Boost</p>
            <div className="control-toggle">
              <label className="toggle-label">
                Control Mode
              </label>
              <div className="toggle-switch-container">
                <span className={`toggle-option ${!useMouseControls ? 'active-option' : 'inactive-option'}`}>
                  Keyboard
                </span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={useMouseControls}
                    onChange={toggleControls}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className={`toggle-option ${useMouseControls ? 'active-option' : 'inactive-option'}`}>
                  Mouse
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="game-container">
          <canvas 
            ref={canvasRef} 
            className="game-canvas"
            width={canvasWidth}
            height={canvasHeight}
          ></canvas>
        </div>
      </div>
    </div>
  );
};

SMutansGame.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default SMutansGame; 