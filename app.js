const GRID_SIZE = 18;
const START_LENGTH = 3;
const INITIAL_SPEED = 170;
const MIN_SPEED = 85;
const SPEED_STEP = 4;
const SPLASH_DURATION = 6500;

const COLORS = {
  boardLight: "#aad751",
  boardDark: "#a2d149",
  head: "#3f7d20",
  body: "#5fa837",
  apple: "#e53935",
  eye: "#f7ffe9",
  stem: "#5d7f27",
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreNode = document.getElementById("score");
const bestNode = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const controlButtons = document.querySelectorAll(".control");
const splashScreen = document.getElementById("splashScreen");

let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let apple = null;
let score = 0;
let best = Number(localStorage.getItem("snake-best") || "0");
let speed = INITIAL_SPEED;
let running = false;
let timerId = null;
let touchStart = null;

bestNode.textContent = String(best);

function resetGame() {
  cancelTick();
  const center = Math.floor(GRID_SIZE / 2);
  snake = Array.from({ length: START_LENGTH }, (_, index) => ({
    x: center - index,
    y: center,
  }));
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  speed = INITIAL_SPEED;
  running = false;
  spawnApple();
  updateScore();
  draw();
}

function startGame() {
  if (running) {
    return;
  }
  running = true;
  hideOverlay();
  scheduleTick();
}

function restartGame() {
  resetGame();
  showOverlay("Snake", "Eat apples, grow longer and stay away from walls.", "Play");
}

function scheduleTick() {
  cancelTick();
  timerId = window.setTimeout(tick, speed);
}

function cancelTick() {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function spawnApple() {
  const free = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) {
        free.push({ x, y });
      }
    }
  }
  apple = free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

function updateScore() {
  scoreNode.textContent = String(score);
  if (score > best) {
    best = score;
    bestNode.textContent = String(best);
    localStorage.setItem("snake-best", String(best));
  }
}

function setDirection(newDir) {
  const isReverse = newDir.x === -direction.x && newDir.y === -direction.y;
  if (!isReverse) {
    nextDirection = newDir;
  }
}

function tick() {
  if (!running) {
    return;
  }

  direction = nextDirection;
  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  const hitWall =
    newHead.x < 0 ||
    newHead.y < 0 ||
    newHead.x >= GRID_SIZE ||
    newHead.y >= GRID_SIZE;

  const hitSelf = snake.slice(0, -1).some((part) => part.x === newHead.x && part.y === newHead.y);

  if (hitWall || hitSelf) {
    gameOver();
    return;
  }

  snake.unshift(newHead);

  if (apple && newHead.x === apple.x && newHead.y === apple.y) {
    score += 1;
    speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
    updateScore();
    spawnApple();
    if (!apple) {
      winGame();
      return;
    }
  } else {
    snake.pop();
  }

  draw();
  scheduleTick();
}

function gameOver() {
  running = false;
  cancelTick();
  draw();
  showOverlay("Game Over", `Final score: ${score}`, "Play Again");
}

function winGame() {
  running = false;
  cancelTick();
  draw();
  showOverlay("Victory!", `You filled the whole field and scored ${score}.`, "Play Again");
}

function showOverlay(title, text, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function drawBoard(cellSize) {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.boardLight : COLORS.boardDark;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
}

function drawApple(cellSize) {
  if (!apple) {
    return;
  }

  const pad = cellSize * 0.18;
  const ax = apple.x * cellSize + pad;
  const ay = apple.y * cellSize + pad * 1.2;
  const size = cellSize - pad * 2;

  ctx.fillStyle = COLORS.apple;
  ctx.beginPath();
  ctx.arc(ax + size / 2, ay + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = COLORS.stem;
  ctx.lineWidth = Math.max(2, cellSize * 0.08);
  ctx.beginPath();
  ctx.moveTo(ax + size * 0.55, ay + size * 0.15);
  ctx.lineTo(ax + size * 0.7, ay - size * 0.15);
  ctx.stroke();
}

function getEyeOffsets(cellSize) {
  if (direction.x === 1) {
    return [
      [cellSize * 0.62, cellSize * 0.28],
      [cellSize * 0.62, cellSize * 0.62],
    ];
  }
  if (direction.x === -1) {
    return [
      [cellSize * 0.22, cellSize * 0.28],
      [cellSize * 0.22, cellSize * 0.62],
    ];
  }
  if (direction.y === -1) {
    return [
      [cellSize * 0.28, cellSize * 0.22],
      [cellSize * 0.62, cellSize * 0.22],
    ];
  }
  return [
    [cellSize * 0.28, cellSize * 0.62],
    [cellSize * 0.62, cellSize * 0.62],
  ];
}

function drawSnake(cellSize) {
  snake.forEach((part, index) => {
    const pad = cellSize * 0.08;
    const x = part.x * cellSize + pad;
    const y = part.y * cellSize + pad;
    const size = cellSize - pad * 2;

    ctx.fillStyle = index === 0 ? COLORS.head : COLORS.body;
    roundRect(ctx, x, y, size, size, cellSize * 0.18);
    ctx.fill();

    if (index === 0) {
      const eyeSize = Math.max(3, cellSize * 0.12);
      ctx.fillStyle = COLORS.eye;
      for (const [ox, oy] of getEyeOffsets(cellSize)) {
        ctx.beginPath();
        ctx.arc(part.x * cellSize + ox, part.y * cellSize + oy, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function draw() {
  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = size * ratio;
  canvas.height = size * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const cellSize = size / GRID_SIZE;
  drawBoard(cellSize);
  drawApple(cellSize);
  drawSnake(cellSize);
}

function directionFromName(name) {
  switch (name) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    default:
      return { x: 1, y: 0 };
  }
}

function handleSwipe(endPoint) {
  if (!touchStart) {
    return;
  }

  const dx = endPoint.x - touchStart.x;
  const dy = endPoint.y - touchStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) < 24) {
    return;
  }

  if (absX > absY) {
    setDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
  } else {
    setDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  }
}

function hideSplash() {
  window.setTimeout(() => {
    splashScreen.classList.add("hidden");
  }, SPLASH_DURATION);
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(directionFromName(button.dataset.dir));
    if (!running) {
      startGame();
    }
  });
});

window.addEventListener("keydown", (event) => {
  const map = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  if (event.key.toLowerCase() === "r") {
    restartGame();
    return;
  }

  if (event.key === " ") {
    startGame();
    return;
  }

  if (map[event.key]) {
    event.preventDefault();
    setDirection(map[event.key]);
  }
});

canvas.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

canvas.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  handleSwipe({ x: touch.clientX, y: touch.clientY });
  touchStart = null;
}, { passive: true });

window.addEventListener("resize", draw);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

resetGame();
showOverlay("Snake", "Open it on your phone, swipe on the field and play right in the browser.", "Play");
hideSplash();
