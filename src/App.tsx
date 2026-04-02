/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Constants
const GRAVITY = 0.35;
const JUMP_STRENGTH = -6.5;
const PIPE_SPEED = 3.5;
const PIPE_SPAWN_RATE = 90; // frames
const PIPE_WIDTH = 70;
const PIPE_GAP = 180;
const BIRD_SIZE = 44; // Slightly larger for better detail
const GROUND_HEIGHT = 120;

type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('thangnc-bird-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Game Refs
  const birdY = useRef(300);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frameCount = useRef(0);
  const animationFrameId = useRef<number>(0);

  const resetGame = useCallback(() => {
    birdY.current = 300;
    birdVelocity.current = 0;
    pipes.current = [];
    frameCount.current = 0;
    setScore(0);
  }, []);

  const startGame = () => {
    resetGame();
    setGameState('PLAYING');
  };

  const jump = useCallback(() => {
    if (gameState === 'PLAYING') {
      birdVelocity.current = JUMP_STRENGTH;
    } else if (gameState === 'START') {
      startGame();
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawBird = (x: number, y: number, velocity: number) => {
      ctx.save();
      ctx.translate(x + BIRD_SIZE / 2, y + BIRD_SIZE / 2);
      ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, velocity * 0.1)));
      
      const p = BIRD_SIZE / 17; // pixel size based on 17x12 grid
      const ox = -BIRD_SIZE / 2;
      const oy = -BIRD_SIZE / 2;

      const drawPixel = (px: number, py: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(ox + px * p, oy + py * p, p + 0.5, p + 0.5); // +0.5 to avoid gaps
      };

      // Bird Pixel Map (Simplified but accurate to the image)
      // 0: transparent, 1: black, 2: yellow, 3: orange, 4: white
      const birdMap = [
        [0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,0,1,1,2,2,2,2,1,4,1,0,0,0,0],
        [0,0,0,1,2,2,2,2,2,1,4,4,4,1,0,0,0],
        [0,1,1,2,2,2,2,2,2,1,4,4,1,4,1,0,0],
        [1,4,4,1,2,2,2,2,2,1,4,4,1,4,1,0,0],
        [1,4,4,4,1,2,2,2,2,2,1,1,1,1,1,1,0],
        [1,4,4,2,2,1,2,2,2,2,2,2,2,2,2,1,0],
        [1,1,1,2,2,2,3,3,3,3,3,3,3,3,1,0,0],
        [0,0,1,3,3,3,3,3,3,1,1,1,1,1,0,0,0],
        [0,0,0,1,1,3,3,3,1,3,3,3,3,1,0,0,0],
        [0,0,0,0,0,1,1,1,3,3,3,3,1,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0],
      ];

      // Refining the eye and beak specifically
      const colors = ["transparent", "#000000", "#f7d519", "#f7941d", "#ffffff"];
      
      for (let row = 0; row < birdMap.length; row++) {
        for (let col = 0; col < birdMap[row].length; col++) {
          const colorIndex = birdMap[row][col];
          if (colorIndex !== 0) {
            drawPixel(col, row, colors[colorIndex]);
          }
        }
      }

      // Add the beak detail (the black line in the middle)
      ctx.fillStyle = "#000000";
      ctx.fillRect(ox + 10 * p, oy + 9 * p, 4 * p, p/2);

      ctx.restore();
    };

    const drawPipe = (x: number, topHeight: number) => {
      const drawFence = (fx: number, fy: number, fw: number, fh: number, isTop: boolean) => {
        // Main Wood
        ctx.fillStyle = '#d39252';
        ctx.fillRect(fx, fy, fw, fh);
        
        // Planks
        const plankW = fw / 3;
        for (let i = 0; i < 3; i++) {
          const px = fx + i * plankW;
          ctx.strokeStyle = '#8c5e31';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, fy, plankW - 4, fh);
          
          // Wood Grain
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.moveTo(px + plankW/2, fy);
          ctx.lineTo(px + plankW/2, fy + fh);
          ctx.stroke();

          // Nails
          ctx.fillStyle = '#5d4037';
          if (isTop) {
            ctx.fillRect(px + plankW / 2 - 2, fy + fh - 20, 4, 4);
            ctx.fillRect(px + plankW / 2 - 2, fy + fh - 40, 4, 4);
          } else {
            ctx.fillRect(px + plankW / 2 - 2, fy + 20, 4, 4);
            ctx.fillRect(px + plankW / 2 - 2, fy + 40, 4, 4);
          }
        }
        
        // Cap
        ctx.fillStyle = '#8c5e31';
        if (isTop) {
          ctx.fillRect(fx - 5, fy + fh - 15, fw + 10, 15);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3;
          ctx.strokeRect(fx - 5, fy + fh - 15, fw + 10, 15);
        } else {
          ctx.fillRect(fx - 5, fy, fw + 10, 15);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3;
          ctx.strokeRect(fx - 5, fy, fw + 10, 15);
        }

        // Outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(fx, fy, fw, fh);
      };

      drawFence(x, 0, PIPE_WIDTH, topHeight, true);
      drawFence(x, topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height - GROUND_HEIGHT - (topHeight + PIPE_GAP), false);
    };

    const drawBackground = () => {
      // Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#4fc3f7');
      skyGrad.addColorStop(1, '#81d4fa');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clouds
      const drawCloud = (cx: number, cy: number, scale: number = 1) => {
        ctx.fillStyle = '#fff';
        const s = scale * 10;
        ctx.fillRect(cx, cy, s * 6, s * 2);
        ctx.fillRect(cx + s, cy - s, s * 4, s);
        ctx.fillRect(cx + s * 1.5, cy + s * 2, s * 3, s);
      };
      drawCloud(50, 100, 0.8);
      drawCloud(250, 150, 1.2);
      drawCloud(150, 300, 0.6);

      // Hills
      const hillY = canvas.height - GROUND_HEIGHT;
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.moveTo(0, hillY);
      ctx.quadraticCurveTo(canvas.width * 0.25, hillY - 120, canvas.width * 0.5, hillY);
      ctx.quadraticCurveTo(canvas.width * 0.75, hillY - 80, canvas.width, hillY);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();
      
      ctx.fillStyle = '#388e3c';
      ctx.beginPath();
      ctx.moveTo(0, hillY);
      ctx.quadraticCurveTo(canvas.width * 0.1, hillY - 60, canvas.width * 0.3, hillY);
      ctx.quadraticCurveTo(canvas.width * 0.6, hillY - 40, canvas.width * 0.8, hillY);
      ctx.fill();
    };

    const drawGround = () => {
      const groundY = canvas.height - GROUND_HEIGHT;
      // Grass Top
      ctx.fillStyle = '#8bc34a';
      ctx.fillRect(0, groundY, canvas.width, 20);
      ctx.fillStyle = '#689f38';
      ctx.fillRect(0, groundY + 15, canvas.width, 5);
      
      // Dirt
      ctx.fillStyle = '#795548';
      ctx.fillRect(0, groundY + 20, canvas.width, GROUND_HEIGHT - 20);
      
      // Dirt Pattern
      ctx.fillStyle = '#5d4037';
      for (let x = -20; x < canvas.width; x += 40) {
        for (let y = groundY + 30; y < canvas.height; y += 40) {
          ctx.fillRect(x + (y % 80 === 0 ? 0 : 20), y, 15, 10);
        }
      }
      
      // Ground Outline
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();
    };

    const update = () => {
      if (gameState !== 'PLAYING') return;

      birdVelocity.current += GRAVITY;
      birdY.current += birdVelocity.current;

      if (birdY.current + BIRD_SIZE > canvas.height - GROUND_HEIGHT || birdY.current < 0) {
        endGame();
      }

      frameCount.current++;
      if (frameCount.current % PIPE_SPAWN_RATE === 0) {
        const minH = 100;
        const maxH = canvas.height - GROUND_HEIGHT - PIPE_GAP - minH;
        const topHeight = Math.floor(Math.random() * (maxH - minH + 1)) + minH;
        pipes.current.push({ x: canvas.width, topHeight, passed: false });
      }

      pipes.current.forEach((pipe) => {
        pipe.x -= PIPE_SPEED;
        const birdX = 80;
        if (
          birdX + BIRD_SIZE > pipe.x &&
          birdX < pipe.x + PIPE_WIDTH &&
          (birdY.current < pipe.topHeight || birdY.current + BIRD_SIZE > pipe.topHeight + PIPE_GAP)
        ) {
          endGame();
        }
        if (!pipe.passed && pipe.x + PIPE_WIDTH < birdX) {
          pipe.passed = true;
          setScore((s) => s + 1);
        }
      });
      pipes.current = pipes.current.filter((p) => p.x + PIPE_WIDTH > 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();
      pipes.current.forEach((p) => drawPipe(p.x, p.topHeight));
      drawGround();
      drawBird(80, birdY.current, birdVelocity.current);

      if (gameState === 'PLAYING') {
        ctx.fillStyle = '#fff';
        ctx.font = '48px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.strokeText(score.toString(), canvas.width / 2, 100);
        ctx.fillText(score.toString(), canvas.width / 2, 100);
      }

      animationFrameId.current = requestAnimationFrame(() => {
        update();
        draw();
      });
    };

    const endGame = () => {
      setGameState('GAME_OVER');
      cancelAnimationFrame(animationFrameId.current);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [gameState, score]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('thangnc-bird-highscore', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="mobile-frame" ref={containerRef} onClick={jump}>
      <canvas ref={canvasRef} className="w-full h-full" />

      <AnimatePresence>
        {gameState === 'START' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/20"
          >
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold title-text tracking-tight leading-tight">
                THANGNC<br />BIRD
              </h1>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="relative px-10 py-5 bg-[#d39252] border-4 border-black rounded-xl shadow-[6px_6px_0_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[3px_3px_0_rgba(0,0,0,1)] transition-all active:translate-y-2 active:translate-x-2 active:shadow-none"
            >
              <span className="text-2xl text-white pixel-text">START</span>
            </button>
            
            <p className="mt-12 text-white pixel-text text-sm">
              BEST SCORE: {highScore}
            </p>
          </motion.div>
        )}

        {gameState === 'GAME_OVER' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/40"
          >
            <h2 className="text-4xl game-over-text mb-8">game over</h2>
            
            <div className="bg-[#d39252] p-6 border-4 border-black rounded-xl shadow-[6px_6px_0_rgba(0,0,0,1)] w-64 mb-8">
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white pixel-text text-sm">SCORE</span>
                  <span className="text-white pixel-text text-3xl">{score}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white pixel-text text-sm">BEST</span>
                  <span className="text-white pixel-text text-3xl">{highScore}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 w-64">
              <button
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-6 py-4 bg-[#d39252] border-4 border-black rounded-xl shadow-[4px_4px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all"
              >
                <span className="text-white pixel-text text-xs">REPLAY</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setGameState('START'); }}
                className="px-6 py-4 bg-[#d39252] border-4 border-black rounded-xl shadow-[4px_4px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all"
              >
                <span className="text-white pixel-text text-xs">MENU</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
