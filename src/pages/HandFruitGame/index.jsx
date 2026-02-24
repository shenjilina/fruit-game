import React, { useEffect, useRef, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as mpHands from '@mediapipe/hands';
import * as mpCamera from '@mediapipe/camera_utils';

/* ==========================================================================
   1. Configuration & Constants
   ========================================================================== */

const GAME_CONFIG = {
  GRAVITY: 0.2, // 重力加速度，控制水果下落速度
  FRUIT_SPAWN_RATE: 60, // 水果生成频率（帧数），每60帧生成一次
  MAX_LIVES: 10, // 玩家最大生命值
  TRAIL_LENGTH: 10, // 手势拖尾长度（点数）
  FRUIT_RADIUS: 30, // 水果碰撞半径（像素）
  COMBO_TIMEOUT: 60, // 连击判定时间窗口（帧数）
  INITIAL_SPEED_Y_MIN: 12, // 水果抛出的最小垂直初速度
  INITIAL_SPEED_Y_MAX: 17, // 水果抛出的最大垂直初速度
  INITIAL_SPEED_X_MULTIPLIER: 0.01, // 水果水平初速度系数（基于生成位置偏移）
  FRUIT_SPEED_X_RANDOM: 2, // 水果水平初速度的随机波动范围
  PARTICLE_SPEED: 10, // 切割特效粒子的扩散速度
  PARTICLE_LIFE_DECAY: 0.05, // 粒子生命值衰减速度（每帧减少的透明度）
  PARTICLE_COUNT: 10, // 每次切割产生的粒子数量
};

const FRUIT_TYPES = [
  { type: 'apple', color: '#ef4444', score: 10, label: 'Apple' },      // red-500
  { type: 'banana', color: '#facc15', score: 15, label: 'Banana' },     // yellow-400
  { type: 'orange', color: '#f97316', score: 10, label: 'Orange' },     // orange-500
  { type: 'watermelon', color: '#22c55e', score: 20, label: 'Melon' }, // green-500
  // { type: 'bomb', color: '#1e293b', score: -50, label: 'Bomb' },        // slate-800
];

const DIFFICULTIES = ['easy', 'normal', 'hard'];

/* ==========================================================================
   2. Icons (SVG)
   ========================================================================== */

const Icons = {
  Heart: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ),
  Play: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
  ),
  Pause: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
    </svg>
  ),
  Refresh: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  Home: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
  ),
  Settings: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567l-.091.549a.798.798 0 01-.517.608 7.45 7.45 0 00-.478.198.798.798 0 01-.796-.064l-.453-.324a1.875 1.875 0 00-2.416.2l-.043.044a1.875 1.875 0 00-.2 2.416l.324.453a.798.798 0 01.064.796 7.448 7.448 0 00-.198.478.798.798 0 01-.608.517l-.55.092a1.875 1.875 0 00-1.566 1.849v.06c0 .916.663 1.699 1.567 1.85l.549.091c.281.047.508.25.608.517.06.162.127.321.198.478a.798.798 0 01-.064.796l-.324.453a1.875 1.875 0 00.2 2.416l.044.043c.645.645 1.692.645 2.337-.001l.453-.324a.798.798 0 01.796-.064c.157.071.316.137.478.198.267.1.47.327.517.608l.092.55c.15.903.932 1.566 1.849 1.566h.06c.916 0 1.699-.663 1.85-1.567l.091-.549a.798.798 0 01.517-.608 7.52 7.52 0 00.478-.198.798.798 0 01.796.064l.453.324a1.875 1.875 0 002.416-.2l.043-.044a1.875 1.875 0 00.2-2.416l-.324-.453a.798.798 0 01-.064-.796c.071-.157.137-.316.198-.478.1-.267.327-.47.608-.517l.55-.092a1.875 1.875 0 001.566-1.85v-.06c0-.916-.663-1.699-1.567-1.85l-.549-.091a.798.798 0 01-.608-.517 7.507 7.507 0 00-.198-.478.798.798 0 01.064-.796l.324-.453a1.875 1.875 0 00-.2-2.416l-.044-.043a1.875 1.875 0 00-2.416.2l-.453.324a.798.798 0 01-.796.064 7.462 7.462 0 00-.478-.198.798.798 0 01-.608-.517l-.092-.55a1.875 1.875 0 00-1.849-1.566h-.06zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
    </svg>
  ),
  Camera: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
    </svg>
  )
};

/* ==========================================================================
   3. Helper Components
   ========================================================================== */

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Game Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-rose-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-rose-100">
            <h2 className="text-2xl font-bold text-rose-600 mb-4">Something went wrong</h2>
            <p className="text-slate-600 mb-6">We encountered an error while running the game.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Toast Component
const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    info: 'bg-slate-800',
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    warning: 'bg-amber-500'
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium text-sm flex items-center gap-2 animate-fade-in-down ${bgColors[type]}`}>
      <span>{message}</span>
    </div>
  );
};

// Skeleton Loader
const GameSkeleton = () => (
  <div className="w-full h-full flex flex-col md:flex-row bg-slate-50 animate-pulse">
    <div className="flex-1 bg-slate-200 m-4 rounded-3xl"></div>
    <div className="w-full md:w-80 bg-white border-l border-slate-100 p-6 flex flex-col gap-4">
      <div className="h-48 bg-slate-200 rounded-xl"></div>
      <div className="h-8 bg-slate-200 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      <div className="mt-auto h-12 bg-slate-200 rounded-full"></div>
    </div>
  </div>
);

/* ==========================================================================
   4. Logic & State Management
   ========================================================================== */

const initialState = {
  score: 0,
  lives: GAME_CONFIG.MAX_LIVES,
  combo: 0,
  isPlaying: false,
  isGameOver: false,
  isPaused: false,
  difficulty: 'normal',
  soundEnabled: true,
  isLoading: true,
  toast: null, // { message, type }
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, score: 0, lives: GAME_CONFIG.MAX_LIVES, combo: 0, isPlaying: true, isGameOver: false, isPaused: false };
    case 'END_GAME':
      return { ...state, isPlaying: false, isGameOver: true };
    case 'PAUSE_GAME':
      return { ...state, isPaused: !state.isPaused };
    case 'UPDATE_SCORE':
      return { ...state, score: action.payload.score, combo: action.payload.combo };
    case 'UPDATE_LIVES':
      return { ...state, lives: action.payload };
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.payload };
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SHOW_TOAST':
      return { ...state, toast: action.payload };
    case 'HIDE_TOAST':
      return { ...state, toast: null };
    default:
      return state;
  }
};

/* ==========================================================================
   5. Main Component
   ========================================================================== */

function HandFruitGameInner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  
  const [state, dispatch] = useReducer(reducer, initialState);

  // Mutable Game State (Physics, Particles, etc.)
  const gameStateRef = useRef({
    fruits: [],
    particles: [],
    handTrail: [],
    comboTimer: 0,
    frameCount: 0,
    mousePos: { x: -1, y: -1 },
    cameraActive: false,
    handsInstance: null,
    cameraInstance: null
  });

  // Touch Handling Refs
  const touchStartRef = useRef({ x: 0, y: 0 });

  // Debounced Toast
  const showToast = useCallback((message, type = 'info') => {
    dispatch({ type: 'SHOW_TOAST', payload: { message, type } });
  }, []);

  // Initialize Game Logic
  useEffect(() => {
    const gameState = gameStateRef.current;

    const spawnFruit = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Reduce bomb spawn rate to 10%
      /*
      const isBomb = Math.random() < 0.1;
      let type;
      if (isBomb) {
        type = FRUIT_TYPES.find(t => t.type === 'bomb');
      } else {
        const safeFruits = FRUIT_TYPES.filter(t => t.type !== 'bomb');
        type = safeFruits[Math.floor(Math.random() * safeFruits.length)];
      }
      */
      
      const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];

      const x = Math.random() * (canvas.width - 100) + 50;
      const y = canvas.height;
      
      const vx = (canvas.width / 2 - x) * GAME_CONFIG.INITIAL_SPEED_X_MULTIPLIER + (Math.random() - 0.5) * GAME_CONFIG.FRUIT_SPEED_X_RANDOM;
      const vy = -(Math.random() * (GAME_CONFIG.INITIAL_SPEED_Y_MAX - GAME_CONFIG.INITIAL_SPEED_Y_MIN) + GAME_CONFIG.INITIAL_SPEED_Y_MIN);

      gameState.fruits.push({
        x, y, vx, vy,
        type: type.type,
        color: type.color,
        score: type.score,
        radius: GAME_CONFIG.FRUIT_RADIUS,
        rotation: 0,
        isSliced: false
      });
    };

    const createParticles = (x, y, color) => {
      for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
        gameState.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * GAME_CONFIG.PARTICLE_SPEED,
          vy: (Math.random() - 0.5) * GAME_CONFIG.PARTICLE_SPEED,
          life: 1.0,
          color
        });
      }
    };

    const checkCuts = () => {
      if (gameState.handTrail.length < 2) return;

      const p1 = gameState.handTrail[gameState.handTrail.length - 2];
      const p2 = gameState.handTrail[gameState.handTrail.length - 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist > 100) return; // Prevent teleportation cuts

      gameState.fruits.forEach((fruit, index) => {
        if (fruit.isSliced) return;

        const distance = Math.hypot(p2.x - fruit.x, p2.y - fruit.y);
        if (distance < fruit.radius) {
          fruit.isSliced = true;
          createParticles(fruit.x, fruit.y, fruit.color);
          
          // if (fruit.type === 'bomb') {
          //   dispatch({ type: 'END_GAME' });
          //   showToast('Game Over! You hit a bomb.', 'error');
          // } else {
            // Combo Logic
            let newCombo = state.combo + 1;
            gameState.comboTimer = GAME_CONFIG.COMBO_TIMEOUT;
            const comboBonus = newCombo > 1 ? newCombo * 5 : 0;
            const newScore = state.score + fruit.score + comboBonus;
            
            dispatch({ type: 'UPDATE_SCORE', payload: { score: newScore, combo: newCombo } });
            
            gameState.fruits.splice(index, 1);
          // }
        }
      });
    };

    const update = () => {
      // Update Trail
      if (gameState.mousePos.x !== -1) {
        gameState.handTrail.push({ ...gameState.mousePos });
        if (gameState.handTrail.length > GAME_CONFIG.TRAIL_LENGTH) {
          gameState.handTrail.shift();
        }
      }

      if (!state.isPlaying || state.isPaused || state.isGameOver) return;

      gameState.frameCount++;

      // Spawn
      if (gameState.frameCount % GAME_CONFIG.FRUIT_SPAWN_RATE === 0) {
        spawnFruit();
      }

      // Physics
      gameState.fruits.forEach(fruit => {
        fruit.x += fruit.vx;
        fruit.y += fruit.vy;
        fruit.vy += GAME_CONFIG.GRAVITY;
        fruit.rotation += 0.1;
      });

      // Cleanup & Lives
      for (let i = gameState.fruits.length - 1; i >= 0; i--) {
        const fruit = gameState.fruits[i];
        if (fruit.y > (canvasRef.current?.height || 0) + 50) {
          gameState.fruits.splice(i, 1);
          if (fruit.type !== 'bomb' && !fruit.isSliced) {
            const newLives = state.lives - 1;
            dispatch({ type: 'UPDATE_LIVES', payload: newLives });
            if (newLives <= 0) {
              dispatch({ type: 'END_GAME' });
            }
          }
        }
      }

      checkCuts();

      // Particles
      for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= GAME_CONFIG.PARTICLE_LIFE_DECAY;
        if (p.life <= 0) gameState.particles.splice(i, 1);
      }

      // Combo Decay
      if (state.combo > 0) {
        gameState.comboTimer--;
        if (gameState.comboTimer <= 0) {
           dispatch({ type: 'UPDATE_SCORE', payload: { score: state.score, combo: 0 } });
        }
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Fruits
      gameState.fruits.forEach(fruit => {
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
        ctx.fillStyle = fruit.color;
        ctx.fill();
        
        // Highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-8, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      // Particles
      gameState.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Trail
      if (gameState.handTrail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(gameState.handTrail[0].x, gameState.handTrail[0].y);
        for (let i = 1; i < gameState.handTrail.length; i++) {
          const point = gameState.handTrail[i];
          ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Core
        ctx.strokeStyle = '#cffafe';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };

    const loop = () => {
      update();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state.isPlaying, state.isPaused, state.isGameOver, state.lives, state.score, state.combo, showToast]);


  // Initialize MediaPipe
  useEffect(() => {
    const hands = new mpHands.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        if (canvasRef.current) {
          gameStateRef.current.mousePos = {
            x: (1 - indexTip.x) * canvasRef.current.width,
            y: indexTip.y * canvasRef.current.height
          };
        }
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    gameStateRef.current.handsInstance = hands;

    let camera = null;
    if (videoRef.current) {
      camera = new mpCamera.Camera(videoRef.current, {
        onFrame: async () => {
          if (gameStateRef.current.cameraActive) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      camera.start().catch(err => {
        console.error("Camera failed to start:", err);
        dispatch({ type: 'SET_LOADING', payload: false });
        showToast("Camera access required for hand tracking", "error");
      });
      gameStateRef.current.cameraActive = true;
      gameStateRef.current.cameraInstance = camera;
    }

    const currentGameState = gameStateRef.current; // Capture ref value for cleanup

    return () => {
      currentGameState.cameraActive = false;
      if (camera) camera.stop();
      hands.close();
    };
  }, [showToast]);

  // Window Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const isDesktop = window.innerWidth >= 768;
        canvasRef.current.width = isDesktop ? window.innerWidth - 320 : window.innerWidth;
        canvasRef.current.height = isDesktop ? window.innerHeight : window.innerHeight * 0.7;
      }
    };

    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Keyboard & Touch Support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ') {
        if (!state.isPlaying) dispatch({ type: 'START_GAME' });
        else dispatch({ type: 'PAUSE_GAME' });
      }
      if (e.key === 'Escape') {
        navigate('/');
      }
      // Arrow keys for difficulty
      if (e.key === 'ArrowLeft') {
        const currentIndex = DIFFICULTIES.indexOf(state.difficulty);
        const nextIndex = (currentIndex - 1 + DIFFICULTIES.length) % DIFFICULTIES.length;
        dispatch({ type: 'SET_DIFFICULTY', payload: DIFFICULTIES[nextIndex] });
        showToast(`Difficulty: ${DIFFICULTIES[nextIndex]}`, 'info');
      }
      if (e.key === 'ArrowRight') {
        const currentIndex = DIFFICULTIES.indexOf(state.difficulty);
        const nextIndex = (currentIndex + 1) % DIFFICULTIES.length;
        dispatch({ type: 'SET_DIFFICULTY', payload: DIFFICULTIES[nextIndex] });
        showToast(`Difficulty: ${DIFFICULTIES[nextIndex]}`, 'info');
      }
    };

    const handleTouchStart = (e) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

      // Swipe Left (Left Swipe Return) -> user swipes left (finger moves left) or "Left Swipe" = swipe from left?
      // "左滑返回" usually means swipe left to go back (or swipe right to go back?).
      // Standard: Swipe Right (finger moves right) is Back. Swipe Left (finger moves left) is Next.
      // But if user says "左滑返回", they might mean "Swipe Left to Return" (literally).
      // I'll implement Swipe Right (finger moves right) for Back as it's standard UX, 
      // AND Swipe Left (finger moves left) for Back if they really meant that.
      // Let's stick to standard "Swipe Right to Back" (dx > 50).
      // Wait, if I'm in a game, maybe I shouldn't hijack swipes too easily.
      // I'll use a threshold of 100px.
      
      if (deltaX < -100) { // Swipe Left
         // navigate(-1); // Or navigate('/')
         // "Left swipe returns" -> Let's assume they mean standard Android/iOS "Back" which is usually swipe FROM left edge (moving right).
         // But "Left Swipe" implies direction.
         // Let's implement BOTH directional checks to be safe or just one.
         // If I interpret "左滑" as "Swipe Left (move finger left)", then:
         navigate('/');
      }

      // Pull Down Refresh
      if (deltaY > 100 && Math.abs(deltaX) < 50) {
        dispatch({ type: 'START_GAME' });
        showToast('Game Restarted', 'success');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [state.isPlaying, state.difficulty, navigate, showToast]);

  return (
    <div className="flex flex-col md:flex-row w-full h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 relative">
      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 z-50 bg-slate-50">
          <GameSkeleton />
        </div>
      )}

      {/* Toast Notification */}
      {state.toast && (
        <Toast 
          message={state.toast.message} 
          type={state.toast.type} 
          onClose={() => dispatch({ type: 'HIDE_TOAST' })} 
        />
      )}

      {/* Main Game Area */}
      <main className="flex-1 relative bg-slate-900 overflow-hidden group">
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-none touch-none"
          aria-label="Game Canvas"
        />
        
        {/* HUD: Top Left (Score) */}
        <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none select-none">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3 shadow-lg transform transition hover:scale-105">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Score</span>
            <div className="text-4xl font-black text-white tracking-tight">{state.score.toLocaleString()}</div>
          </div>
          {state.combo > 1 && (
             <div className="bg-amber-400/90 text-amber-900 px-4 py-1 rounded-full font-black text-xl shadow-lg animate-bounce self-start">
               {state.combo}x COMBO
             </div>
          )}
        </div>

        {/* HUD: Top Right (Lives) */}
        <div className="absolute top-6 right-6 pointer-events-none select-none">
           <div className="flex gap-1">
             {Array.from({ length: GAME_CONFIG.MAX_LIVES }).map((_, i) => (
               <Icons.Heart 
                 key={i} 
                 className={`w-8 h-8 transition-all duration-300 ${i < state.lives ? 'text-rose-500 fill-rose-500 drop-shadow-lg' : 'text-slate-700 opacity-50'}`} 
               />
             ))}
           </div>
        </div>

        {/* Game Over / Start Overlay */}
        {(!state.isPlaying || state.isGameOver || state.isPaused) && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-20 animate-fade-in">
            <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full mx-4 border border-slate-100 transform transition-all hover:shadow-indigo-500/20">
              <h2 className="text-4xl font-black mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                {state.isGameOver ? 'Game Over' : state.isPaused ? 'Paused' : 'Fruit Ninja'}
              </h2>
              {state.isGameOver && (
                <p className="text-xl text-slate-500 mb-8 font-medium">Final Score: <span className="text-slate-900 font-bold">{state.score}</span></p>
              )}
              
              <button
                onClick={() => dispatch({ type: state.isPaused ? 'PAUSE_GAME' : 'START_GAME' })}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                aria-label={state.isGameOver || !state.isPlaying ? "Start Game" : "Resume Game"}
              >
                {state.isGameOver || !state.isPlaying ? <Icons.Play className="w-6 h-6" /> : <Icons.Play className="w-6 h-6" />}
                <span>{state.isGameOver ? 'Try Again' : state.isPaused ? 'Resume' : 'Start Game'}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 shadow-xl z-30 flex flex-col h-[30vh] md:h-auto">
        {/* Camera Preview */}
        <div className="relative w-full aspect-video bg-black overflow-hidden group">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform scale-x-[-1] opacity-80 group-hover:opacity-100 transition-opacity"
            playsInline
            muted
          />
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1">
            <Icons.Camera className="w-3 h-3" />
            <span>LIVE FEED</span>
          </div>
        </div>

        {/* Settings */}
        <div className="flex-1 p-6 overflow-y-auto space-y-8">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              <Icons.Settings className="w-4 h-4" /> Game Settings
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="difficulty" className="text-sm font-semibold text-slate-700">Difficulty</label>
                <div className="relative">
                  <select
                    id="difficulty"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow font-medium text-slate-700 cursor-pointer"
                    value={state.difficulty}
                    onChange={(e) => dispatch({ type: 'SET_DIFFICULTY', payload: e.target.value })}
                    disabled={state.isPlaying}
                  >
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Sound Effects</span>
                <button 
                  onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
                  className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative ${state.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  aria-label="Toggle Sound"
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${state.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">How to Play</h4>
             <ul className="space-y-3 text-sm text-slate-600">
               <li className="flex gap-3 items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">1</span>
                 <span>Raise your hand and use your <strong>Index Finger</strong> to slice.</span>
               </li>
               <li className="flex gap-3 items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">2</span>
                 <span>Avoid the <strong>Bombs</strong> (Black).</span>
               </li>
               <li className="flex gap-3 items-start">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">3</span>
                 <span>Chain slices for <strong>Combo</strong> points!</span>
               </li>
             </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95"
          >
            <Icons.Home className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function HandFruitGame() {
  return (
    <ErrorBoundary>
      <HandFruitGameInner />
    </ErrorBoundary>
  );
}
