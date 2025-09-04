const socket = io();

const joinSection = document.getElementById("join-section");
const gameSection = document.getElementById("game-section");
const nameInput = document.getElementById("name-input");
const joinBtn = document.getElementById("join-btn");
const questionText = document.getElementById("question-text");
const answersList = document.getElementById("answers-list");
const timerEl = document.getElementById("time-left");
const resultDiv = document.getElementById("result");

let currentQuestion = null;
let timerInterval = null;
let timeLeft = 15;
let answered = false;

joinBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) {
    alert("Por favor, escribe tu nombre.");
    return;
  }
  socket.emit("player-join", name);
  joinSection.style.display = "none";
  gameSection.style.display = "block";
};

socket.on("new-question", (question) => {
  currentQuestion = question;
  answered = false;
  timeLeft = 15;
  timerEl.textContent = ` ${timeLeft}`;
  questionText.textContent = question.question;
  answersList.innerHTML = "";

  question.answers.forEach((answer, index) => {
    const li = document.createElement("li");
    li.textContent = answer;
    li.onclick = () => {
      if (answered) return;
      answered = true;
      socket.emit("answer", index);
      Array.from(answersList.children).forEach((child) =>
        child.classList.remove("selected")
      );
      li.classList.add("selected");
    };
    answersList.appendChild(li);
  });

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = ` ${timeLeft}`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      answered = true;
      // Aquí podrías emitir evento para tiempo agotado, si quieres
    }
  }, 1000);
});

socket.on("show-ranking", (ranking) => {
  // Parar temporizador anterior si existe
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  questionText.textContent = "📊 Ranking Provisional - TOP 5";
  answersList.innerHTML = "";
  answered = true; // bloquear interacción

  const top5 = ranking.slice(0, 5);
  top5.forEach((player, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${player.name} - ${player.score} pts`;
    answersList.appendChild(li);
  });

  // Cuenta atrás visible durante el ranking (ejemplo 10 segundos)
  timeLeft = 10;
  timerEl.textContent = ``;

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      timerEl.textContent = ` ${timeLeft}`;
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      timerEl.textContent = "";
      // Aquí avisa al servidor que se terminó el tiempo de ranking para pasar a la siguiente pregunta
      socket.emit("ranking-timeout");
    }
  }, 1000);
});

socket.on("game-over", () => {
  gameSection.style.display = "none";
  resultDiv.style.display = "block";
});
