import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../styles/SMutansGame.css';

const SMutansGame = ({ onClose, tokenCount, onTokenUse }) => {
  // Game dimensions
  const canvasWidth = 800;
  const canvasHeight = 600;
  const worldWidth = 3000;
  const worldHeight = 3000;
  
  // Game state
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [boostEnergy, setBoostEnergy] = useState(100);
  const [lives, setLives] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMessage, setGameMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  // Remove the internal tokens state and use the prop instead
  // const [tokens, setTokens] = useState(3);

  // Refs for game objects
  const canvasRef = useRef(null);
  const scoreRef = useRef(0); // Add a ref for the score to ensure real-time updates
  const boostTimerRef = useRef(1500); // 1.5 seconds boost duration in milliseconds
  const playerRef = useRef({
    body: [{ x: worldWidth / 2, y: worldHeight / 2 }],
    direction: { x: 0, y: 0 },
    targetDirection: { x: 0, y: 0 },
    normalSpeed: 300,
    boostSpeed: 600,
    speed: 300,
    size: 15,
    turnRate: Math.PI * 1.5, // Increased for sharper turns
    color: `hsl(${Math.random() * 360}, 80%, 50%)`,
    isBoosting: false,
  });
  const foodRef = useRef([]);
  const enemiesRef = useRef([]);
  const mouseDownRef = useRef(false);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const cameraRef = useRef({
    x: worldWidth / 2 - canvasWidth / 2,
    y: worldHeight / 2 - canvasHeight / 2,
    zoom: 1,
  });
  const foodEatenRef = useRef(0); // Track foods eaten for segment growth
  const worldWrapRef = useRef({ x: false, y: false }); // Track if player just wrapped around world

  // Function to show a message that fades out
  const showGameMessage = (message) => {
    setGameMessage(message);
    setShowMessage(true);
    
    // Hide the message after 5 seconds
    setTimeout(() => {
      setShowMessage(false);
    }, 5000);
  };

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Generate initial food with varying sizes
    foodRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * worldWidth,
      y: Math.random() * worldHeight,
      size: 5 + Math.random() * 10, // Random size between 5 and 15
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
    }));

    // Generate initial enemies
    enemiesRef.current = Array.from({ length: 15 }, () => {
      // Create enemies with varied lengths
      let length;
      const lengthRandom = Math.random();
      
      if (lengthRandom < 0.4) {
        // 40% chance of smaller enemies (3-5 segments)
        length = 3 + Math.floor(Math.random() * 3);
      } else if (lengthRandom < 0.7) {
        // 30% chance of medium enemies (6-8 segments)
        length = 6 + Math.floor(Math.random() * 3);
      } else if (lengthRandom < 0.9) {
        // 20% chance of larger enemies (9-11 segments)
        length = 9 + Math.floor(Math.random() * 3);
      } else {
        // 10% chance of very large enemies (12-15 segments)
        length = 12 + Math.floor(Math.random() * 4);
      }
      
      const size = 8 + Math.random() * 12; // Start with smaller sizes
      const speed = 80 + Math.random() * 140;
      
      const enemy = {
        body: [{ 
          x: Math.random() * worldWidth, 
          y: Math.random() * worldHeight 
        }],
        direction: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
        targetDirection: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 }, // Added for gradual turning
        speed,
        normalSpeed: speed, // Base speed for boost mechanic
        size,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        thinkTime: 0,
        thinkInterval: 1500 + Math.random() * 1500,
        foodEaten: 0,
        turnRate: Math.PI * 0.5, // Added for gradual turning
        isBoosting: false, // Added for boost mechanic
        boostTimer: 0, // Added for boost duration
        boostDuration: 1000 + Math.random() * 2000, // 1-3 seconds boost duration
      };
      
      // Normalize direction vector
      const magnitude = Math.sqrt(enemy.direction.x ** 2 + enemy.direction.y ** 2);
      enemy.direction.x /= magnitude;
      enemy.direction.y /= magnitude;
      
      const directionAngle = Math.atan2(enemy.direction.y, enemy.direction.x);
      for (let i = 1; i < length; i++) {
        enemy.body.push({
          x: enemy.body[0].x - Math.cos(directionAngle) * i * size * 1.5,
          y: enemy.body[0].y - Math.sin(directionAngle) * i * size * 1.5,
        });
      }
      return enemy;
    });

    // Event listeners
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dx = mouseX - canvasWidth / 2;
      const dy = mouseY - canvasHeight / 2;
      const angle = Math.atan2(dy, dx);
      playerRef.current.targetDirection = { x: Math.cos(angle), y: Math.sin(angle) };
    };

    const handleMouseDown = () => (mouseDownRef.current = true);
    const handleMouseUp = () => (mouseDownRef.current = false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Game loop
    let spawnTimer = 0;
    const gameLoop = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = timestamp;

      if (!gameOver) {
        update(deltaTime, spawnTimer);
        render(ctx);
      }
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gameOver]);

  // Update game state
  const update = (deltaTime, spawnTimer) => {
    const player = playerRef.current;
    const mouseIsDown = mouseDownRef.current && boostEnergy > 0;

    // Reset world wrap tracking
    worldWrapRef.current = { x: false, y: false };

    // Update boost mechanics
    if (mouseIsDown && boostTimerRef.current > 0) {
      player.isBoosting = true;
      player.speed = player.boostSpeed;
      setBoostEnergy((prev) => Math.max(0, prev - deltaTime * 20));
      boostTimerRef.current -= deltaTime * 1000; // Convert deltaTime to milliseconds
    } else {
      player.isBoosting = false;
      player.speed = player.normalSpeed;
      setBoostEnergy((prev) => Math.min(100, prev + deltaTime * 10));
      // Only recover boost timer when not boosting
      if (!mouseIsDown) {
        boostTimerRef.current = Math.min(1500, boostTimerRef.current + deltaTime * 200); // Slowly recover boost timer
      }
    }

    // Improved turning logic to ensure consistent direction
    const targetAngle = Math.atan2(player.targetDirection.y, player.targetDirection.x);
    let currentAngle = Math.atan2(player.direction.y, player.direction.x);
    
    // Calculate the difference between angles
    let angleDiff = targetAngle - currentAngle;
    
    // Ensure the difference is in the range [-PI, PI]
    if (angleDiff > Math.PI) {
      angleDiff -= 2 * Math.PI;
    } else if (angleDiff < -Math.PI) {
      angleDiff += 2 * Math.PI;
    }
    
    // Apply turn rate limit
    const maxTurn = player.turnRate * deltaTime;
    if (Math.abs(angleDiff) > maxTurn) {
      currentAngle += Math.sign(angleDiff) * maxTurn;
    } else {
      currentAngle = targetAngle;
    }
    
    // Ensure the angle stays in the range [-PI, PI]
    if (currentAngle > Math.PI) {
      currentAngle -= 2 * Math.PI;
    } else if (currentAngle < -Math.PI) {
      currentAngle += 2 * Math.PI;
    }
    
    player.direction = { x: Math.cos(currentAngle), y: Math.sin(currentAngle) };

    // Move player
    const head = { ...player.body[0] };
    
    head.x += player.direction.x * player.speed * deltaTime;
    head.y += player.direction.y * player.speed * deltaTime;
    
    // Handle world wrapping with detection
    if (head.x < 0) {
      head.x += worldWidth;
      worldWrapRef.current.x = true;
    } else if (head.x > worldWidth) {
      head.x -= worldWidth;
      worldWrapRef.current.x = true;
    }
    
    if (head.y < 0) {
      head.y += worldHeight;
      worldWrapRef.current.y = true;
    } else if (head.y > worldHeight) {
      head.y -= worldHeight;
      worldWrapRef.current.y = true;
    }

    // Update player body with improved wrapping
    const newBody = [head];
    const spacing = player.size * 1.5;
    let prevSegment = head;
    
    for (let i = 1; i < player.body.length; i++) {
      const current = player.body[i];
      
      // Calculate dx and dy considering world wrapping
      let dx = prevSegment.x - current.x;
      let dy = prevSegment.y - current.y;
      
      // Handle wrapping for body segments with smoother transitions
      if (Math.abs(dx) > worldWidth / 2) {
        if (dx > 0) {
          // If previous segment is on the right edge, adjust current segment
          if (prevSegment.x > worldWidth / 2) {
            current.x += worldWidth;
          } else {
            current.x -= worldWidth;
          }
        } else {
          // If previous segment is on the left edge, adjust current segment
          if (prevSegment.x < worldWidth / 2) {
            current.x -= worldWidth;
          } else {
            current.x += worldWidth;
          }
        }
        dx = prevSegment.x - current.x;
      }
      
      if (Math.abs(dy) > worldHeight / 2) {
        if (dy > 0) {
          // If previous segment is on the bottom edge, adjust current segment
          if (prevSegment.y > worldHeight / 2) {
            current.y += worldHeight;
          } else {
            current.y -= worldHeight;
          }
        } else {
          // If previous segment is on the top edge, adjust current segment
          if (prevSegment.y < worldHeight / 2) {
            current.y -= worldHeight;
          } else {
            current.y += worldHeight;
          }
        }
        dy = prevSegment.y - current.y;
      }
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > spacing) {
        const angle = Math.atan2(dy, dx);
        const newX = prevSegment.x - Math.cos(angle) * spacing;
        const newY = prevSegment.y - Math.sin(angle) * spacing;
        
        // Create new segment
        const newSegment = {
          x: (newX + worldWidth) % worldWidth,
          y: (newY + worldHeight) % worldHeight
        };
        
        newBody.push(newSegment);
        prevSegment = newSegment;
      } else {
        // Keep the segment at its current position
        const newSegment = { ...current };
        newBody.push(newSegment);
        prevSegment = newSegment;
      }
    }
    
    player.body = newBody;

    // Update camera with improved wrapping handling
    const targetZoom = 1 / (1 + player.body.length * 0.05);
    cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * 0.1;
    
    if (worldWrapRef.current.x || worldWrapRef.current.y) {
      // Use lerp for smoother camera transition even during wrapping
      const targetX = player.body[0].x - (canvasWidth / 2) / cameraRef.current.zoom;
      const targetY = player.body[0].y - (canvasHeight / 2) / cameraRef.current.zoom;
      
      // Determine the shortest path for camera movement
      let dx = targetX - cameraRef.current.x;
      let dy = targetY - cameraRef.current.y;
      
      if (Math.abs(dx) > worldWidth / 2) {
        dx = dx > 0 ? dx - worldWidth : dx + worldWidth;
      }
      if (Math.abs(dy) > worldHeight / 2) {
        dy = dy > 0 ? dy - worldHeight : dy + worldHeight;
      }
      
      // Apply smooth movement
      cameraRef.current.x += dx * 0.2;
      cameraRef.current.y += dy * 0.2;
      
      // Ensure camera position stays within world bounds
      cameraRef.current.x = (cameraRef.current.x + worldWidth) % worldWidth;
      cameraRef.current.y = (cameraRef.current.y + worldHeight) % worldHeight;
    } else {
      // Normal smooth camera movement
      const targetX = player.body[0].x - (canvasWidth / 2) / cameraRef.current.zoom;
      const targetY = player.body[0].y - (canvasHeight / 2) / cameraRef.current.zoom;
      cameraRef.current.x += (targetX - cameraRef.current.x) * 0.1;
      cameraRef.current.y += (targetY - cameraRef.current.y) * 0.1;
    }

    // Food consumption - updated with boost refresh
    foodRef.current = foodRef.current.filter((food) => {
      // Player consumption
      const playerDistance = Math.hypot(player.body[0].x - food.x, player.body[0].y - food.y);
      if (playerDistance < player.size + food.size) {
        // Update both the state and the ref for the score
        scoreRef.current += 1;
        setScore(scoreRef.current);
        
        foodEatenRef.current += 1;
        
        // Only increase size until segment 7
        if (player.body.length < 8) {
          player.size += 0.03; // Reduced to 0.03 - very slow growth
        }

        // Refresh boost timer when food is consumed
        boostTimerRef.current = 1500;

        // Growth based on absolute score thresholds
        const currentScore = scoreRef.current;
        
        // Check current body length and add segments when score thresholds are reached
        if (player.body.length === 1 && currentScore >= 10) {
          // Add second segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 2 && currentScore >= 25) {
          // Add third segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 3 && currentScore >= 50) {
          // Add fourth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 4 && currentScore >= 100) {
          // Add fifth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 5 && currentScore >= 200) {
          // Add sixth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
          // Display message at 6 segments
          showGameMessage("You're through the surface enamel! Keep it up!");
        } else if (player.body.length === 6 && currentScore >= 400) {
          // Add seventh segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 7 && currentScore >= 600) {
          // Add eighth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
          // Display message at 8 segments
          showGameMessage("You're through the DEJ! Just a little more!");
        } else if (player.body.length === 8 && currentScore >= 900) {
          // Add ninth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 9 && currentScore >= 1200) {
          // Add tenth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 10 && currentScore >= 1500) {
          // Add eleventh segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
          // Display message at 11 segments
          showGameMessage("Seaman Timmy now has Irreversible Pulpitis!");
        } else if (player.body.length === 11 && currentScore >= 2000) {
          // Add twelfth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 12 && currentScore >= 2500) {
          // Add thirteenth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
          // Display message at 13 segments
          showGameMessage("Sinus Tractacular!");
        } else if (player.body.length === 13 && currentScore >= 3500) {
          // Add fourteenth segment
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
        } else if (player.body.length === 14 && currentScore >= 5000) {
          // Add fifteenth segment - win condition!
          const lastSegment = player.body[player.body.length - 1];
          player.body.push({ ...lastSegment });
          // Display victory message
          showGameMessage("Congratulations! You have successfully caused Rampant Caries!");
          // Award additional tokens
          onTokenUse(-5); // Negative value to add tokens instead of using them
        }
        
        return false;
      }
      
      // Enemy consumption
      for (const enemy of enemiesRef.current) {
        const enemyHead = enemy.body[0];
        const enemyDistance = Math.hypot(enemyHead.x - food.x, enemyHead.y - food.y);
        if (enemyDistance < enemy.size + food.size) {
          enemy.foodEaten += 1;
          
          // Only increase enemy size until segment 7 (not 8 anymore)
          if (enemy.body.length < 8) {
            enemy.size += 0.03; // Reduced to 0.03 - very slow growth
          }
          
          // For enemies, use a food-eaten based system 
          // but with higher requirements than the old system
          if (enemy.body.length === 1 && enemy.foodEaten >= 15) {
            // Add second segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          } else if (enemy.body.length === 2 && enemy.foodEaten >= 35) {
            // Add third segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          } else if (enemy.body.length === 3 && enemy.foodEaten >= 70) {
            // Add fourth segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          } else if (enemy.body.length === 4 && enemy.foodEaten >= 120) {
            // Add fifth segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          } else if (enemy.body.length === 5 && enemy.foodEaten >= 250) {
            // Add sixth segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          } else if (enemy.body.length === 6 && enemy.foodEaten >= 450) {
            // Add seventh segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          } else if (enemy.body.length === 7 && enemy.foodEaten >= 900) {
            // Add eighth segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          } else if (enemy.body.length === 8 && enemy.foodEaten >= 1500) {
            // Add ninth segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          } else if (enemy.body.length === 9 && enemy.foodEaten >= 2500) {
            // Add tenth segment
            const lastSegment = enemy.body[enemy.body.length - 1];
            enemy.body.push({ ...lastSegment });
          }
          // Cap enemies at 10 segments to give players an advantage
          
          return false;
        }
      }
      
      return true;
    });

    // Respawn food with varying sizes
    while (foodRef.current.length < 50) {
      foodRef.current.push({
        x: Math.random() * worldWidth,
        y: Math.random() * worldHeight,
        size: 5 + Math.random() * 10, // Random size between 5 and 15
        color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      });
    }

    // Update enemies with gradual turning and boost mechanics
    enemiesRef.current.forEach((enemy) => {
      enemy.thinkTime += deltaTime * 1000;
      if (enemy.thinkTime > enemy.thinkInterval) {
        enemy.thinkTime = 0;
        const angle = Math.random() * Math.PI * 2;
        enemy.targetDirection = { 
          x: Math.cos(angle), 
          y: Math.sin(angle) 
        };
      }

      // Gradual turning logic
      const targetAngle = Math.atan2(enemy.targetDirection.y, enemy.targetDirection.x);
      let currentAngle = Math.atan2(enemy.direction.y, enemy.direction.x);
      let angleDiff = targetAngle - currentAngle;
      
      // Normalize angle difference to [-PI, PI]
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      else if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      // Apply turn rate limit
      const maxTurn = enemy.turnRate * deltaTime;
      if (Math.abs(angleDiff) > maxTurn) {
        currentAngle += Math.sign(angleDiff) * maxTurn;
      } else {
        currentAngle = targetAngle;
      }
      
      enemy.direction = { 
        x: Math.cos(currentAngle), 
        y: Math.sin(currentAngle) 
      };

      // Boost logic
      if (enemy.isBoosting) {
        enemy.speed = enemy.normalSpeed * 2;
        enemy.boostTimer -= deltaTime * 1000;
        if (enemy.boostTimer <= 0) {
          enemy.isBoosting = false;
          enemy.speed = enemy.normalSpeed;
        }
      } else {
        if (Math.random() < 0.01 * deltaTime) { // Small chance to boost
          enemy.isBoosting = true;
          enemy.boostTimer = enemy.boostDuration;
          enemy.speed = enemy.normalSpeed * 2;
        }
      }

      // Move enemy
      const enemyHead = { ...enemy.body[0] };
      enemyHead.x += enemy.direction.x * enemy.speed * deltaTime;
      enemyHead.y += enemy.direction.y * enemy.speed * deltaTime;
      enemyHead.x = (enemyHead.x + worldWidth) % worldWidth;
      enemyHead.y = (enemyHead.y + worldHeight) % worldHeight;

      // Update enemy body segments
      const enemyNewBody = [enemyHead];
      const enemySpacing = enemy.size * 1.5;
      for (let i = 1; i < enemy.body.length; i++) {
        const prev = enemyNewBody[i - 1];
        const current = enemy.body[i];
        
        // Calculate dx and dy considering world wrapping
        let dx = prev.x - current.x;
        let dy = prev.y - current.y;
        
        // Handle wrapping for body segments
        if (Math.abs(dx) > worldWidth / 2) {
          dx = dx > 0 ? dx - worldWidth : dx + worldWidth;
        }
        if (Math.abs(dy) > worldHeight / 2) {
          dy = dy > 0 ? dy - worldHeight : dy + worldHeight;
        }
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > enemySpacing) {
          const angle = Math.atan2(dy, dx);
          let newX = prev.x - Math.cos(angle) * enemySpacing;
          let newY = prev.y - Math.sin(angle) * enemySpacing;
          
          // Ensure new position is within world bounds
          newX = (newX + worldWidth) % worldWidth;
          newY = (newY + worldHeight) % worldHeight;
          
          enemyNewBody.push({ x: newX, y: newY });
        } else {
          enemyNewBody.push({ ...current });
        }
      }
      enemy.body = enemyNewBody;
    });

    // Spawn new enemies with increased spawn rate
    spawnTimer += deltaTime * 1000; // Add the elapsed time
    
    // Adjust spawn delay based on player length
    let spawnDelay = 1000; // Default spawn delay
    
    // When player reaches length 8 or more, increase spawn delay
    if (player.body.length >= 8) {
      // Adjust spawn delay based on player's size
      // The longer the player, the longer the delay
      const extraDelay = Math.min(2000, (player.body.length - 7) * 250); // Cap at +2000ms
      spawnDelay = 1000 + extraDelay;
    }
    
    // Adjust max enemy count based on player length - more aggressive scaling
    let maxEnemies = 105; // Default max enemies
    if (player.body.length >= 8) {
      // Start reducing enemies sooner (segment 8 instead of 10)
      // Reduce at a faster rate (10 instead of 5 per segment)
      // Lower minimum to 40 (from 60)
      maxEnemies = Math.max(40, 105 - (player.body.length - 7) * 10);
    }
    
    if (spawnTimer > spawnDelay && enemiesRef.current.length < maxEnemies) {
      spawnTimer = 0;
      enemiesRef.current.push(createNewEnemy(player));
    }

    // Check collisions
    // Player vs enemy bodies
    enemiesRef.current.forEach((enemy) => {
      enemy.body.forEach((segment) => {
        const distance = Math.hypot(player.body[0].x - segment.x, player.body[0].y - segment.y);
        if (distance < player.size + enemy.size) {
          setGameOver(true);
        }
      });
    });

    // Enemy vs player and other enemies
    const toRemove = [];
    const killedByEnemy = new Set(); // Track which enemies were killed by other enemies
    
    enemiesRef.current.forEach((enemy, index) => {
      const head = enemy.body[0];
      // Check against player
      player.body.forEach((segment) => {
        const distance = Math.hypot(head.x - segment.x, head.y - segment.y);
        if (distance < enemy.size + player.size) {
          toRemove.push(index);
          // Not adding to killedByEnemy since this is killed by player
        }
      });
      // Check against other enemies
      enemiesRef.current.forEach((otherEnemy, otherIndex) => {
        if (index !== otherIndex) {
          otherEnemy.body.forEach((segment) => {
            const distance = Math.hypot(head.x - segment.x, head.y - segment.y);
            if (distance < enemy.size + otherEnemy.size) {
              toRemove.push(index);
              killedByEnemy.add(index); // Mark this enemy as killed by another enemy
            }
          });
        }
      });
    });
    
    // For each removed enemy, spawn a new one in a different location
    const removedCount = new Set(toRemove).size;
    
    // Convert enemy bodies to food before removing them
    toRemove.forEach(index => {
      const dyingEnemy = enemiesRef.current[index];
      const wasKilledByEnemy = killedByEnemy.has(index);
      
      // Convert each body segment into food
      dyingEnemy.body.forEach((segment, segmentIndex) => {
        // For enemies killed by other enemies, only convert every other segment
        if (wasKilledByEnemy && segmentIndex % 2 !== 0) {
          return; // Skip every other segment for enemy-on-enemy kills
        }
        
        // Create 1-2 food items per segment in nearby positions
        const foodCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < foodCount; i++) {
          // Randomize position within a radius of the segment
          const explosionRadius = dyingEnemy.size * 2; // Reduced to 2x
          const angle = (i / foodCount) * Math.PI * 2; // Evenly distribute around the segment
          const distance = Math.random() * explosionRadius;
          
          // Add a new food item with random properties
          foodRef.current.push({
            x: segment.x + Math.cos(angle) * distance,
            y: segment.y + Math.sin(angle) * distance,
            size: 3 + Math.random() * (dyingEnemy.size * 0.8), // Random size up to 80% of enemy size
            color: `hsl(${Math.random() * 360}, ${70 + Math.random() * 30}%, ${40 + Math.random() * 20}%)`, // Random vibrant color
          });
        }
      });
      
      // Create additional particle effect for head explosion
      const head = dyingEnemy.body[0];
      for (let i = 0; i < 6; i++) { // Reduced from 8 to 6
        const angle = (i / 6) * Math.PI * 2;
        const distance = 15 + Math.random() * 25; // Slightly reduced
        
        foodRef.current.push({
          x: head.x + Math.cos(angle) * distance,
          y: head.y + Math.sin(angle) * distance,
          size: 3 + Math.random() * 7, // Smaller food particles
          color: `hsl(${Math.random() * 360}, 90%, 60%)`, // Bright random colors
        });
      }
    });
    
    enemiesRef.current = enemiesRef.current.filter((_, idx) => !toRemove.includes(idx));
    
    // Spawn new enemies to replace the ones that died
    for (let i = 0; i < removedCount; i++) {
      enemiesRef.current.push(createNewEnemy(player));
    }
  };

  // Helper function to create a new enemy
  const createNewEnemy = (player) => {
    const minSpawnDistance = 600;
    let newPos;
    do {
      newPos = { 
        x: Math.random() * worldWidth, 
        y: Math.random() * worldHeight 
      };
    } while (Math.hypot(newPos.x - player.body[0].x, newPos.y - player.body[0].y) < minSpawnDistance);

    // Base new enemy properties on player's current state
    const playerLength = player.body.length;
    
    // Increase potential enemy length - up to 7 segments longer than player
    // But ensure minimum length of 3
    const minLength = Math.max(3, playerLength - 2); 
    const maxLength = playerLength + 7; // Up to 7 segments longer than player
    
    // Random length distribution - weighted more towards shorter lengths
    // This creates more variety while not making every enemy too difficult
    let lengthRandomizer = Math.random();
    let length;
    
    if (lengthRandomizer < 0.5) {
      // 50% chance of being within 3 segments of player length
      length = minLength + Math.floor(Math.random() * 3);
    } else if (lengthRandomizer < 0.75) {
      // 25% chance of being 3-5 segments longer
      length = playerLength + 3 + Math.floor(Math.random() * 3);
    } else {
      // 25% chance of being 5-7 segments longer
      length = playerLength + 5 + Math.floor(Math.random() * 3);
    }
    
    // Cap enemy length at 15 segments for performance and fairness
    length = Math.min(length, 15);
    
    const minSize = Math.max(8, player.size - 5);
    const maxSize = player.size + 5;
    const size = minSize + Math.random() * (maxSize - minSize);
    
    const speed = 80 + Math.random() * 140;
    
    const newEnemy = {
      body: [newPos],
      direction: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
      targetDirection: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
      speed,
      normalSpeed: speed,
      size,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      thinkTime: 0,
      thinkInterval: 1500 + Math.random() * 1500,
      foodEaten: 0,
      turnRate: Math.PI * 0.5,
      isBoosting: false,
      boostTimer: 0,
      boostDuration: 1000 + Math.random() * 2000,
    };
    
    // Normalize direction vector
    const magnitude = Math.sqrt(newEnemy.direction.x ** 2 + newEnemy.direction.y ** 2);
    newEnemy.direction.x /= magnitude;
    newEnemy.direction.y /= magnitude;
    
    // Initialize body segments properly
    const directionAngle = Math.atan2(newEnemy.direction.y, newEnemy.direction.x);
    for (let i = 1; i < length; i++) {
      const prevSegment = i === 1 ? newPos : newEnemy.body[i - 1];
      const newSegment = {
        x: prevSegment.x - Math.cos(directionAngle) * size * 1.5,
        y: prevSegment.y - Math.sin(directionAngle) * size * 1.5
      };
      newEnemy.body.push(newSegment);
    }
    
    return newEnemy;
  };

  // Render game
  const render = (ctx) => {
    const camera = cameraRef.current;
    const player = playerRef.current;
    const zoom = camera.zoom;
    
    // Clear canvas
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Define offsets for 3x3 grid
    const offsets = [
      { dx: -worldWidth, dy: -worldHeight },
      { dx: 0, dy: -worldHeight },
      { dx: worldWidth, dy: -worldHeight },
      { dx: -worldWidth, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: worldWidth, dy: 0 },
      { dx: -worldWidth, dy: worldHeight },
      { dx: 0, dy: worldHeight },
      { dx: worldWidth, dy: worldHeight },
    ];

    // Setup camera transform
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-player.body[0].x, -player.body[0].y);

    // Draw grid for each offset
    offsets.forEach(({ dx, dy }) => {
    // Draw grid
    ctx.strokeStyle = '#1E1E1E';
    ctx.lineWidth = 1;
      const gridSize = 400; // Increased grid size
      for (let x = 0; x < worldWidth; x += gridSize) {
      ctx.beginPath();
        ctx.moveTo(x + dx, dy);
        ctx.lineTo(x + dx, worldHeight + dy);
      ctx.stroke();
    }
      for (let y = 0; y < worldHeight; y += gridSize) {
      ctx.beginPath();
        ctx.moveTo(dx, y + dy);
        ctx.lineTo(worldWidth + dx, y + dy);
      ctx.stroke();
    }
    
      // Draw food with offsets
      foodRef.current.forEach((food) => {
        const x = food.x + dx;
        const y = food.y + dy;
        
        // Draw food and cilia
        ctx.beginPath();
        ctx.arc(x, y, food.size, 0, Math.PI * 2);
        ctx.fillStyle = food.color;
        ctx.fill();

        // Draw cilia
        const ciliaCount = 8;
        for (let i = 0; i < ciliaCount; i++) {
          const angle = (i / ciliaCount) * Math.PI * 2;
          const ciliaLength = food.size * 0.5;
          const ciliaX = x + Math.cos(angle) * (food.size + ciliaLength);
          const ciliaY = y + Math.sin(angle) * (food.size + ciliaLength);
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * food.size, y + Math.sin(angle) * food.size);
          ctx.lineTo(ciliaX, ciliaY);
          ctx.strokeStyle = food.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Draw enemies with offsets
      enemiesRef.current.forEach((enemy) => {
        enemy.body.forEach((segment, index) => {
          const x = segment.x + dx;
          const y = segment.y + dy;
      
      ctx.beginPath();
          ctx.arc(x, y, enemy.size, 0, Math.PI * 2);
          ctx.fillStyle = index === 0 ? darkenColor(enemy.color) : enemy.color;
      ctx.fill();
          
          // Add cute eyeballs to the enemy head segment
          if (index === 0) {
            const eyeSize = enemy.size * 0.25;
            const eyeOffset = enemy.size * 0.35;
            
            // Direction vector (normalized)
            const dx = enemy.body.length > 1 ? enemy.body[0].x - enemy.body[1].x : 1;
            const dy = enemy.body.length > 1 ? enemy.body[0].y - enemy.body[1].y : 0;
            const length = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / length;
            const ny = dy / length;
            
            // Draw left eye
            ctx.beginPath();
            const leftEyeX = x + eyeOffset * (-ny);
            const leftEyeY = y + eyeOffset * (nx);
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Draw right eye
            ctx.beginPath();
            const rightEyeX = x + eyeOffset * (ny);
            const rightEyeY = y + eyeOffset * (-nx);
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Draw pupils (looking in direction of movement)
            const pupilSize = eyeSize * 0.6;
            const pupilOffset = eyeSize * 0.3;
            
            // Left pupil
            ctx.beginPath();
            ctx.arc(leftEyeX + nx * pupilOffset, leftEyeY + ny * pupilOffset, pupilSize, 0, Math.PI * 2);
            ctx.fillStyle = 'black';
            ctx.fill();
            
            // Right pupil
            ctx.beginPath();
            ctx.arc(rightEyeX + nx * pupilOffset, rightEyeY + ny * pupilOffset, pupilSize, 0, Math.PI * 2);
            ctx.fillStyle = 'black';
            ctx.fill();
          }

          // Draw cilia
          const ciliaCount = 8;
          for (let i = 0; i < ciliaCount; i++) {
            const angle = (i / ciliaCount) * Math.PI * 2;
            const ciliaLength = enemy.size * 0.5;
            const ciliaX = x + Math.cos(angle) * (enemy.size + ciliaLength);
            const ciliaY = y + Math.sin(angle) * (enemy.size + ciliaLength);
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * enemy.size, y + Math.sin(angle) * enemy.size);
            ctx.lineTo(ciliaX, ciliaY);
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });
    });

    // Draw player (only once in the center offset)
    player.body.forEach((segment, index) => {
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, player.size, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? darkenColor(player.color) : player.color;
      ctx.fill();
      
      // Add cute eyeballs to the head segment
      if (index === 0) {
        const eyeSize = player.size * 0.25;
        const eyeOffset = player.size * 0.35;
        
        // Direction vector (normalized)
        const dx = player.body.length > 1 ? player.body[0].x - player.body[1].x : 1;
        const dy = player.body.length > 1 ? player.body[0].y - player.body[1].y : 0;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / length;
        const ny = dy / length;
        
        // Draw left eye
        ctx.beginPath();
        const leftEyeX = segment.x + eyeOffset * (-ny);
        const leftEyeY = segment.y + eyeOffset * (nx);
        ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        // Draw right eye
        ctx.beginPath();
        const rightEyeX = segment.x + eyeOffset * (ny);
        const rightEyeY = segment.y + eyeOffset * (-nx);
        ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        // Draw pupils (looking in direction of movement)
        const pupilSize = eyeSize * 0.6;
        const pupilOffset = eyeSize * 0.3;
        
        // Left pupil
        ctx.beginPath();
        ctx.arc(leftEyeX + nx * pupilOffset, leftEyeY + ny * pupilOffset, pupilSize, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        
        // Right pupil
        ctx.beginPath();
        ctx.arc(rightEyeX + nx * pupilOffset, rightEyeY + ny * pupilOffset, pupilSize, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
      }
      
      // Draw cilia
      const ciliaCount = 8;
      for (let i = 0; i < ciliaCount; i++) {
        const angle = (i / ciliaCount) * Math.PI * 2;
        const ciliaLength = player.size * 0.5;
        const ciliaX = segment.x + Math.cos(angle) * (player.size + ciliaLength);
        const ciliaY = segment.y + Math.sin(angle) * (player.size + ciliaLength);
      ctx.beginPath();
        ctx.moveTo(segment.x + Math.cos(angle) * player.size, segment.y + Math.sin(angle) * player.size);
        ctx.lineTo(ciliaX, ciliaY);
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    ctx.restore();

    // Draw HUD
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 30);
  };

  // Helper to darken color
  const darkenColor = (hsl) => {
    const [h, s, l] = hsl.match(/\d+/g).map(Number);
    return `hsl(${h}, ${s}%, ${Math.max(20, l - 20)}%)`;
  };

  // Reset game
  const resetGame = (shouldDecrementLife = true) => {
    if (lives <= 0) {
      return;
    }

    if (shouldDecrementLife) {
      setLives(prev => prev - 1);
    }
    
    setGameOver(false);
    const initialPlayerBody = { x: worldWidth / 2, y: worldHeight / 2 };
    playerRef.current = {
      body: [initialPlayerBody],
      direction: { x: 0, y: 0 },
      targetDirection: { x: 0, y: 0 },
      normalSpeed: 300,
      boostSpeed: 600,
      speed: 300,
      size: 15, // Reduced from 20 to 15 - smaller starting diameter
      turnRate: Math.PI * 1.5,
      color: `hsl(${Math.random() * 360}, 80%, 50%)`,
      isBoosting: false,
      segmentGrowthCounter: 0, // Initialize segment growth counter
    };
    boostTimerRef.current = 1500;
    scoreRef.current = 0;
    setScore(0);
    setBoostEnergy(100);
    foodEatenRef.current = 0;
    worldWrapRef.current = { x: false, y: false };
    
    // Generate food
    foodRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * worldWidth,
      y: Math.random() * worldHeight,
      size: 5 + Math.random() * 10,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
    }));
    
    // Generate initial enemies
    enemiesRef.current = Array.from({ length: 15 }, () => {
      // Create enemies with varied lengths
      let length;
      const lengthRandom = Math.random();
      
      if (lengthRandom < 0.4) {
        // 40% chance of smaller enemies (3-5 segments)
        length = 3 + Math.floor(Math.random() * 3);
      } else if (lengthRandom < 0.7) {
        // 30% chance of medium enemies (6-8 segments)
        length = 6 + Math.floor(Math.random() * 3);
      } else if (lengthRandom < 0.9) {
        // 20% chance of larger enemies (9-11 segments)
        length = 9 + Math.floor(Math.random() * 3);
      } else {
        // 10% chance of very large enemies (12-15 segments)
        length = 12 + Math.floor(Math.random() * 4);
      }
      
      const size = 8 + Math.random() * 12; // Start with smaller sizes
      const speed = 80 + Math.random() * 140;
      
      const enemy = {
        body: [{ 
          x: Math.random() * worldWidth, 
          y: Math.random() * worldHeight 
        }],
        direction: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
        targetDirection: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
        speed,
        normalSpeed: speed,
        size,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        thinkTime: 0,
        thinkInterval: 1500 + Math.random() * 1500,
        foodEaten: 0,
        turnRate: Math.PI * 0.5,
        isBoosting: false,
        boostTimer: 0,
        boostDuration: 1000 + Math.random() * 2000,
      };
      
      // Normalize direction vector
      const magnitude = Math.sqrt(enemy.direction.x ** 2 + enemy.direction.y ** 2);
      enemy.direction.x /= magnitude;
      enemy.direction.y /= magnitude;
      
      // Initialize body segments properly
      const directionAngle = Math.atan2(enemy.direction.y, enemy.direction.x);
      for (let i = 1; i < length; i++) {
        const prevSegment = i === 1 ? enemy.body[0] : enemy.body[i - 1];
        const newSegment = {
          x: prevSegment.x - Math.cos(directionAngle) * size * 1.5,
          y: prevSegment.y - Math.sin(directionAngle) * size * 1.5
        };
        enemy.body.push(newSegment);
      }
      
      return enemy;
    });
  };

  // Update the useToken function to use the prop and callback
  const useToken = () => {
    if (tokenCount > 0) {
      // Call the callback to update the parent's token count
      onTokenUse();
      
      // Reset everything completely - create a brand new game with 1 segment
      setLives(3);
      setGameOver(false);
      setScore(0);
      scoreRef.current = 0;
      setBoostEnergy(100);
      foodEatenRef.current = 0;
      
      const initialPlayerBody = { x: worldWidth / 2, y: worldHeight / 2 };
      playerRef.current = {
        body: [initialPlayerBody], // Start with just 1 segment
        direction: { x: 0, y: 0 },
        targetDirection: { x: 0, y: 0 },
        normalSpeed: 300,
        boostSpeed: 600,
        speed: 300,
        size: 15, // Reduced from 20 to 15 - smaller starting diameter
        turnRate: Math.PI * 1.5,
        color: `hsl(${Math.random() * 360}, 80%, 50%)`,
        isBoosting: false,
        segmentGrowthCounter: 0, // Initialize segment growth counter
      };
      
      boostTimerRef.current = 1500;
      worldWrapRef.current = { x: false, y: false };
      
      // Generate fresh food
      foodRef.current = Array.from({ length: 50 }, () => ({
        x: Math.random() * worldWidth,
        y: Math.random() * worldHeight,
        size: 5 + Math.random() * 10,
        color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      }));
      
      // Generate fresh enemies
      enemiesRef.current = Array.from({ length: 15 }, () => {
        const length = 3 + Math.floor(Math.random() * 3); // Start with smaller enemies
        const size = 8 + Math.random() * 12;
        const speed = 80 + Math.random() * 140;
        
        const enemy = {
          body: [{ 
            x: Math.random() * worldWidth, 
            y: Math.random() * worldHeight 
          }],
          direction: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
          targetDirection: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
          speed,
          normalSpeed: speed,
          size,
          color: `hsl(${Math.random() * 360}, 100%, 50%)`,
          thinkTime: 0,
          thinkInterval: 1500 + Math.random() * 1500,
          foodEaten: 0,
          turnRate: Math.PI * 0.5,
          isBoosting: false,
          boostTimer: 0,
          boostDuration: 1000 + Math.random() * 2000,
        };
        
        // Normalize direction vector
        const magnitude = Math.sqrt(enemy.direction.x ** 2 + enemy.direction.y ** 2);
        enemy.direction.x /= magnitude;
        enemy.direction.y /= magnitude;
        
        // Initialize body segments properly
        const directionAngle = Math.atan2(enemy.direction.y, enemy.direction.x);
        for (let i = 1; i < length; i++) {
          const prevSegment = i === 1 ? enemy.body[0] : enemy.body[i - 1];
          const newSegment = {
            x: prevSegment.x - Math.cos(directionAngle) * size * 1.5,
            y: prevSegment.y - Math.sin(directionAngle) * size * 1.5
          };
          enemy.body.push(newSegment);
        }
        
        return enemy;
      });
    }
  };

  const startGame = () => {
    setGameStarted(true);
    resetGame(false); // Don't decrement life on first game start
  };
  
  return (
    <div className="s-mutans-game">
          <button className="exit-button" onClick={onClose}>Exit</button>
      <div className="game-stats">
        <span className="lives-counter">Lives: {lives}</span>
      </div>
      <canvas ref={canvasRef} className="game-canvas" />
      
      {/* Game message that fades in and out */}
      {showMessage && (
        <div className="game-message">
          {gameMessage}
        </div>
      )}
      
      {!gameStarted && !gameOver && (
        <div className="game-over-overlay start-screen">
          <h2>S. Mutans!</h2>
          <p>Eat food to grow bigger and avoid other bacteria!</p>
          <p>Use mouse to control direction</p>
          <p>Hold left mouse button to boost</p>
          <button onClick={startGame}>Start Game</button>
        </div>
      )}
      {gameOver && (
        <div className="game-over-overlay">
          <h2>Game Over</h2>
          <p>Your Score: {score}</p>
          {lives > 0 ? (
            <>
              <p>Lives Remaining: {lives}</p>
              <button onClick={resetGame}>Try Again</button>
            </>
          ) : (
            <>
              <h2>Out of Lives</h2>
              <p>Would you like to use a token for 3 more lives?</p>
              <p className="tokens-remaining">Tokens Remaining: {tokenCount}</p>
              <div className="button-container">
                <button 
                  className="use-token" 
                  onClick={useToken} 
                  disabled={tokenCount <= 0}
                >
                  Use Token
                </button>
                <button className="exit-button" onClick={onClose}>Back to the Galley</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

SMutansGame.propTypes = {
  onClose: PropTypes.func.isRequired,
  tokenCount: PropTypes.number.isRequired,
  onTokenUse: PropTypes.func.isRequired,
};

export default SMutansGame; 