// Jango Duel — minimal prototype
const el = {
  game: document.getElementById("game"),
  prompt: document.getElementById("prompt"),
  sub: document.getElementById("sub"),
 waitClock: document.getElementById("waitClock"),
 adBtn: document.getElementById("adBtn"),
  lives: document.getElementById("lives"),
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  player: document.getElementById("player"),
  enemy: document.getElementById("enemy"),
   flash: document.getElementById("flash"),
     startPage: document.getElementById("startPage"),
  startMainBtn: document.getElementById("startMainBtn"),
  hud: document.getElementById("hud"),
  arena: document.getElementById("arena"),
  restartBtn: document.getElementById("restartBtn"),
};

const state = {
  lives: 3,
  score: 0,
  best: Number(localStorage.getItem("jango_best") || 0),
  phase: "idle", // idle | waiting | fire | result | gameover
  fireAt: 0,
  fireTimeoutId: null,
  minDelay: 900,   // will get harder
  maxDelay: 2200,
  enemyReactionBase: 420, // ms (lower = harder)
  wins: 0,
  enemyStage: 0,
};
const enemies = [
  {
    name: "Bandit",
    img: "./image/bandit.png",
  },
  {
    name: "Outlaw",
    img: "./image/outlaw.png",
  },
  {
    name: "Sheriff",
    img: "./image/sheriff.png",
  }
];

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }

function renderHUD() {
  el.lives.textContent = String(state.lives);
  el.score.textContent = String(state.score);
  el.best.textContent = String(state.best);
}

function setPrompt(main, sub = "") {
  if (el.prompt) el.prompt.textContent = main;
  if (el.sub) el.sub.textContent = sub;
}
function showClock() {
  if (el.waitClock) el.waitClock.classList.remove("hidden");
  if (el.prompt) el.prompt.textContent = ""; // WAIT ტექსტი აღარ გვინდა
}

function hideClock() {
  if (el.waitClock) el.waitClock.classList.add("hidden");
}

function resetFighters() {
  el.player.classList.remove("fighter--hit", "fighter--dead", "fallen");
  el.enemy.classList.remove("fighter--hit", "fighter--dead", "fallen");
}

function startRound() {
  if (state.phase === "gameover") return;

  resetFighters();
  state.phase = "waiting";

  // difficulty ramps with score
  const level = Math.floor(state.score / 5); // every 5 wins harder
  const minD = clamp(state.minDelay - level * 40, 450, 900);
  const maxD = clamp(state.maxDelay - level * 60, 900, 2400);
  const waitMs = randInt(minD, maxD);

  setPrompt("", "Don’t shoot early.");
showClock();

  

  clearTimeout(state.fireTimeoutId);
  state.fireAt = 0;

  state.fireTimeoutId = setTimeout(() => {
    state.phase = "fire";
    state.fireAt = performance.now();
    hideClock();
    setPrompt("FIRE!", "Tap/click NOW!");
    el.flash.classList.add("on");
setTimeout(() => el.flash.classList.remove("on"), 220);

    // enemy reaction: a bit random, harder over time
    const enemyBase = clamp(state.enemyReactionBase - level * 12, 180, 520);
    const enemyReact = randInt(enemyBase - 40, enemyBase + 70);

    // if player doesn't shoot before enemyReact -> player loses
 state.fireTimeoutId = setTimeout(() => {
  if (state.phase === "fire") {
    playShotEffect(el.enemy); // ✅ muzzle flash on Bandit
    loseLife("Too slow — the bandit shot first.");
    el.player.classList.add("fighter--hit");
  }
}, enemyReact);

  }, waitMs);
}

function winRound(reactionMs) {
  state.phase = "result";
el.enemy.classList.add("fighter--hit", "fighter--dead", "fallen");

  // scoring: faster reaction = more points (simple)
  const points = clamp(Math.round((800 - reactionMs) / 10), 5, 80);
  state.score += points;

  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("jango_best", String(state.best));
  }
  // ✅ win counter
  state.wins += 1;

  // ✅ every 3 wins -> +3 lives
  if (state.wins % 3 === 0) {
    state.lives += 3;
  }
  // ✅ ყოველ 3 გამარჯვებაზე — ახალი მოწინააღმდეგე
  if (state.wins % 3 === 0) {
    state.enemyStage = Math.min(
      state.enemyStage + 1,
      enemies.length - 1
    );
    updateEnemy();
  }
  renderHUD();
  setPrompt("WIN!", `Reaction: ${Math.round(reactionMs)} ms  (+${points})`);

  // next round
  setTimeout(() => startRound(), 900);
}

 

function loseLife(reason) {
  if (state.phase === "result" || state.phase === "gameover") return; // ✅ guard

  state.phase = "result";
  state.lives -= 1;
  renderHUD();

  if (state.lives <= 0) {
    gameOver(reason);
    return;
  }

  setPrompt("MISS!", `${reason}  Lives left: ${state.lives}`);

  // ✅ ძალიან მნიშვნელოვანია — ძველი timeout-ის გაწმენდა
  clearTimeout(state.fireTimeoutId);

  setTimeout(() => startRound(), 1000);
}

function gameOver(reason) {
  state.phase = "gameover";
  el.player.classList.add("fighter--dead", "fallen");
  setPrompt("GAME OVER", reason);

  if (el.adBtn) el.adBtn.classList.remove("hidden");
  if (el.restartBtn) el.restartBtn.classList.remove("hidden");
}

function onShootAttempt() {
  // Ignore clicks on buttons (so UI works)
  // Still allow click anywhere else
  if (state.phase === "idle") return;

if (state.phase === "waiting") {
  clearTimeout(state.fireTimeoutId); // ✅
  el.player.classList.add("fighter--hit");
  loseLife("False start — you shot too early.");
  return;
}

if (state.phase === "fire") {
  playShotEffect(el.player);         // ✅ muzzle flash on Jango
  clearTimeout(state.fireTimeoutId); // cancel enemy shot
  const reaction = performance.now() - state.fireAt;
  winRound(reaction);
  return;
}

  // result/gameover => ignore
}

function restartGame() {
  clearTimeout(state.fireTimeoutId);
  state.lives = 3;
  state.score = 0;
   state.wins = 0;
   state.enemyStage = 0;
  state.phase = "idle";
  resetFighters();
  renderHUD();
  setPrompt("Press Start", "Tap/click when you see “FIRE!”");

  if (el.adBtn) el.adBtn.classList.add("hidden");
  if (el.restartBtn) el.restartBtn.classList.add("hidden");

  setPrompt("WAIT…", "Don’t shoot early.");
}




// tap/click anywhere in the arena/game
el.game.addEventListener("pointerdown", (e) => {
  // if user taps Start/Restart, let buttons handle it
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "button") return;
  onShootAttempt();
});

renderHUD();
el.best.textContent = String(state.best);
function openGameFromMainPage() {
  if (el.startPage) el.startPage.classList.add("hidden");
  if (el.hud) el.hud.classList.remove("hidden");
  if (el.arena) el.arena.classList.remove("hidden");

  // ✅ პირდაპირ დაიწყოს პირველი რაუნდი
  startRound();
}
if (el.adBtn) {
  el.adBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // რომ სროლად არ ჩათვალოს
    // მარტივი ვარიანტი: თავიდან დაწყება
    restartGame();
    // და პირდაპირ ახალი რაუნდი
    startRound();
  });
}
if (el.restartBtn) {
  el.restartBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    restartGame();
    startRound();
  });
}

if (el.startMainBtn) {
  el.startMainBtn.addEventListener("click", openGameFromMainPage);
}
function playShotEffect(fighterEl){
  const flash = fighterEl.querySelector(".muzzle-flash");
  if(!flash) return;

  flash.classList.remove("on");
  // force reflow
  flash.offsetHeight;
  flash.classList.add("on");

  // screen flash
  if(el.flash){
    el.flash.classList.remove("on");
    el.flash.offsetHeight;
    el.flash.classList.add("on");
  }
}
function updateEnemy() {
  const enemy = enemies[state.enemyStage];
  if (!enemy) return;

  const img = el.enemy.querySelector(".fighter__img");
  const name = el.enemy.querySelector(".fighter__name");

  if (img) img.src = enemy.img;
  if (name) name.textContent = enemy.name;
}