import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

type Position = { x: number; y: number; z: number };
type GameState = 'menu' | 'playing' | 'won' | 'lost';

interface Enemy {
  position: Position;
  velocity: Position;
  type: 'mouse' | 'dog' | 'guard';
  radius: number;
  patrolPath?: Position[];
  patrolIndex?: number;
}

interface Level {
  id: number;
  name: string;
  location: string;
  enemies: number;
  enemySpeed: number;
  lives: number;
  timeLimit: number;
  bgColor: string;
  floorColor: string;
  tableColor: string;
  emoji: string;
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Уровень 1: Кухня',
    location: 'kitchen',
    enemies: 1,
    enemySpeed: 0.8,
    lives: 3,
    timeLimit: 60,
    bgColor: '#FEF7CD',
    floorColor: '#8B5CF6',
    tableColor: '#D97706',
    emoji: '🏠',
  },
  {
    id: 2,
    name: 'Уровень 2: Сад',
    location: 'garden',
    enemies: 2,
    enemySpeed: 1.2,
    lives: 3,
    timeLimit: 45,
    bgColor: '#D4F1F4',
    floorColor: '#22C55E',
    tableColor: '#A855F7',
    emoji: '🌳',
  },
  {
    id: 3,
    name: 'Уровень 3: Бассейн',
    location: 'pool',
    enemies: 3,
    enemySpeed: 1.5,
    lives: 2,
    timeLimit: 40,
    bgColor: '#BAE6FD',
    floorColor: '#0EA5E9',
    tableColor: '#FB923C',
    emoji: '🏊',
  },
  {
    id: 4,
    name: 'Уровень 4: Гостиная',
    location: 'living',
    enemies: 3,
    enemySpeed: 1.8,
    lives: 2,
    timeLimit: 35,
    bgColor: '#FED7AA',
    floorColor: '#7C3AED',
    tableColor: '#DC2626',
    emoji: '🛋️',
  },
  {
    id: 5,
    name: 'Уровень 5: Подвал',
    location: 'basement',
    enemies: 4,
    enemySpeed: 2.0,
    lives: 2,
    timeLimit: 30,
    bgColor: '#A3A3A3',
    floorColor: '#1F2937',
    tableColor: '#92400E',
    emoji: '🕯️',
  },
];

export default function Index() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [catPosition, setCatPosition] = useState<Position>({ x: 0, y: 0, z: -5 });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [fishPosition] = useState<Position>({ x: 0, y: 0.5, z: 3 });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => new Set(prev).add(e.key.toLowerCase()));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key.toLowerCase());
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('lost');
          toast({
            title: '⏰ Время вышло!',
            description: 'Кот не успел украсть рыбу',
            variant: 'destructive',
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, toast]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      const speed = 0.15;
      let newX = catPosition.x;
      let newZ = catPosition.z;

      if (keys.has('arrowup') || keys.has('w')) newZ += speed;
      if (keys.has('arrowdown') || keys.has('s')) newZ -= speed;
      if (keys.has('arrowleft') || keys.has('a')) newX -= speed;
      if (keys.has('arrowright') || keys.has('d')) newX += speed;

      newX = Math.max(-8, Math.min(8, newX));
      newZ = Math.max(-8, Math.min(8, newZ));

      const distanceToFish = Math.sqrt(
        Math.pow(newX - fishPosition.x, 2) + Math.pow(newZ - fishPosition.z, 2)
      );

      if (distanceToFish < 0.8) {
        setScore((prev) => prev + 100);
        setGameState('won');
        toast({
          title: '🎉 Победа!',
          description: 'Кот успешно украл рыбу!',
        });
        return;
      }

      setEnemies((prevEnemies) =>
        prevEnemies.map((enemy) => {
          const newEnemy = { ...enemy };

          if (enemy.patrolPath && enemy.patrolIndex !== undefined) {
            const target = enemy.patrolPath[enemy.patrolIndex];
            const dx = target.x - enemy.position.x;
            const dz = target.z - enemy.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < 0.2) {
              newEnemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
            } else {
              const levelData = LEVELS[selectedLevel];
              newEnemy.position = {
                ...enemy.position,
                x: enemy.position.x + (dx / distance) * levelData.enemySpeed * 0.02,
                z: enemy.position.z + (dz / distance) * levelData.enemySpeed * 0.02,
              };
            }
          }

          const distanceToPlayer = Math.sqrt(
            Math.pow(newEnemy.position.x - newX, 2) + Math.pow(newEnemy.position.z - newZ, 2)
          );

          if (distanceToPlayer < enemy.radius + 0.5) {
            const pushX = (newX - newEnemy.position.x) * 0.3;
            const pushZ = (newZ - newEnemy.position.z) * 0.3;
            newX -= pushX;
            newZ -= pushZ;

            setLives((prev) => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                setGameState('lost');
                toast({
                  title: '💔 Игра окончена',
                  description: 'У кота закончились жизни',
                  variant: 'destructive',
                });
              }
              return newLives;
            });
          }

          return newEnemy;
        })
      );

      setCatPosition({ x: newX, y: 0, z: newZ });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameState, catPosition, keys, fishPosition, selectedLevel, toast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const currentLevel = LEVELS[selectedLevel];

      ctx.fillStyle = currentLevel.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = currentLevel.floorColor;
      ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

      const toScreen = (pos: Position) => {
        const scale = 30;
        const perspective = 300 / (300 + pos.z * 30);
        return {
          x: canvas.width / 2 + pos.x * scale * perspective,
          y: canvas.height / 2 - pos.y * scale * perspective + 50,
          scale: perspective,
        };
      };

      const table = toScreen({ x: 0, y: 0.5, z: 3 });
      ctx.fillStyle = currentLevel.tableColor;
      ctx.beginPath();
      ctx.ellipse(table.x, table.y, 120 * table.scale, 80 * table.scale, 0, 0, Math.PI * 2);
      ctx.fill();

      const fish = toScreen(fishPosition);
      ctx.fillStyle = '#F97316';
      ctx.font = `${48 * fish.scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐟', fish.x, fish.y);

      enemies.forEach((enemy) => {
        const pos = toScreen(enemy.position);
        const emoji =
          enemy.type === 'mouse' ? '🐭' : enemy.type === 'dog' ? '🐕' : '👮';
        ctx.font = `${40 * pos.scale}px Arial`;
        ctx.fillText(emoji, pos.x, pos.y);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, enemy.radius * 30 * pos.scale, 0, Math.PI * 2);
        ctx.stroke();
      });

      const cat = toScreen(catPosition);
      ctx.font = `${40 * cat.scale}px Arial`;
      ctx.fillText('🐈‍⬛', cat.x, cat.y);
    };

    if (gameState === 'playing') {
      render();
    }
  }, [catPosition, enemies, fishPosition, gameState, selectedLevel]);

  const startGame = (levelIndex: number) => {
    setSelectedLevel(levelIndex);
    const level = LEVELS[levelIndex];
    setCatPosition({ x: 0, y: 0, z: -5 });
    setLives(level.lives);
    setTimeLeft(level.timeLimit);
    setScore(0);

    const newEnemies: Enemy[] = [];
    for (let i = 0; i < level.enemies; i++) {
      const angle = (i / level.enemies) * Math.PI * 2;
      const radius = 4;
      const type: Enemy['type'] =
        i === 0 ? 'mouse' : i === 1 ? 'dog' : 'guard';

      const patrolRadius = 3 + i;
      const patrolPath: Position[] = [];
      for (let j = 0; j < 8; j++) {
        const pathAngle = (j / 8) * Math.PI * 2;
        patrolPath.push({
          x: Math.cos(pathAngle) * patrolRadius,
          y: 0,
          z: Math.sin(pathAngle) * patrolRadius,
        });
      }

      newEnemies.push({
        position: {
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius,
        },
        velocity: { x: 0, y: 0, z: 0 },
        type,
        radius: type === 'mouse' ? 0.8 : type === 'dog' ? 1.2 : 1.0,
        patrolPath,
        patrolIndex: 0,
      });
    }
    setEnemies(newEnemies);
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('menu');
    setScore(0);
  };

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF7CD] via-[#E5DEFF] to-[#D3E4FD] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 bg-white/90 backdrop-blur shadow-2xl">
          <div className="text-center space-y-6">
            <h1 className="text-5xl font-bold text-primary flex items-center justify-center gap-3">
              <span className="text-6xl">🐈‍⬛</span>
              Кот-Вор
              <span className="text-6xl">🐟</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Укради рыбу со стола, избегая врагов!
            </p>

            <div className="space-y-4 mt-8">
              <h2 className="text-2xl font-semibold mb-4">Выбери уровень:</h2>
              {LEVELS.map((level, index) => (
                <Card
                  key={level.id}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
                  onClick={() => startGame(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <span className="text-2xl">{level.emoji}</span>
                        {level.name}
                      </h3>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>👾 Врагов: {level.enemies}</span>
                        <span>❤️ Жизни: {level.lives}</span>
                        <span>⏱️ Время: {level.timeLimit}с</span>
                      </div>
                    </div>
                    <Button size="lg" className="ml-4">
                      Играть
                      <Icon name="Play" className="ml-2" size={20} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8 p-4 bg-accent/10 rounded-lg">
              <h3 className="font-semibold mb-2">🎮 Управление:</h3>
              <p className="text-sm">Стрелки или WASD для движения</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (gameState === 'won' || gameState === 'lost') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF7CD] via-[#E5DEFF] to-[#D3E4FD] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur shadow-2xl text-center">
          <div className="text-6xl mb-4">{gameState === 'won' ? '🎉' : '😿'}</div>
          <h2 className="text-3xl font-bold mb-4">
            {gameState === 'won' ? 'Победа!' : 'Игра окончена'}
          </h2>
          <p className="text-xl mb-6">Счёт: {score}</p>
          <div className="space-y-3">
            {gameState === 'won' && selectedLevel < LEVELS.length - 1 && (
              <Button
                size="lg"
                className="w-full"
                onClick={() => startGame(selectedLevel + 1)}
              >
                Следующий уровень
                <Icon name="ChevronRight" className="ml-2" size={20} />
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => startGame(selectedLevel)}
            >
              Повторить уровень
              <Icon name="RotateCcw" className="ml-2" size={20} />
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={resetGame}>
              В меню
              <Icon name="Home" className="ml-2" size={20} />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF7CD] via-[#E5DEFF] to-[#D3E4FD] p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-6 text-lg font-semibold">
            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg">
              <Icon name="Trophy" className="text-primary" size={24} />
              <span>{score}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg">
              <Icon name="Heart" className="text-destructive" size={24} />
              <span>{lives}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg">
              <Icon name="Timer" className="text-accent" size={24} />
              <span>{timeLeft}с</span>
            </div>
          </div>
          <Button variant="outline" onClick={resetGame}>
            <Icon name="X" className="mr-2" size={20} />
            Выход
          </Button>
        </div>

        <Card className="w-full aspect-video overflow-hidden bg-white shadow-2xl">
          <canvas
            ref={canvasRef}
            width={1200}
            height={675}
            className="w-full h-full"
          />
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground bg-white/60 py-2 rounded-lg">
          Используй стрелки ← ↑ → ↓ или WASD для движения
        </div>
      </div>
    </div>
  );
}
