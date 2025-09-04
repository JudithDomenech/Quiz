const socket = io();

const qrImg = document.getElementById("qr");
const nextBtn = document.getElementById("next-question-btn");
const questionSection = document.getElementById("question-section");
const questionText = document.getElementById("question-text");
const answersList = document.getElementById("answers-list");
const playersList = document.getElementById("players-list");
const rankingList = document.getElementById("ranking-list");

// Generar QR para jugadores
const url = window.location.origin + "/player.html";
qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
  url
)}`;

// Estado para controlar el botón dinámico
let questionIndex = 0;
nextBtn.textContent = "Iniciar el Juego";

nextBtn.onclick = () => {
  socket.emit("next-question");
  nextBtn.disabled = true;

  // Cuando empieza la pregunta, ocultamos ranking y mostramos pregunta
  rankingList.style.display = "none";
  questionSection.style.display = "block";
  rankingList.innerHTML = "";

  // Después de la primera vez, el botón cambia a "Siguiente Pregunta"
  if (questionIndex === 0) {
    nextBtn.textContent = "Siguiente Pregunta";
  }
  questionIndex++;
};

socket.on("new-question", (question) => {
  // Mostrar pregunta, ocultar ranking
  questionSection.style.display = "block";
  rankingList.style.display = "none";

  questionText.textContent = question.question;
  answersList.innerHTML = "";
  question.answers.forEach((answer) => {
    const li = document.createElement("li");
    li.textContent = answer;
    answersList.appendChild(li);
  });

  nextBtn.disabled = false;
});

socket.on("show-ranking", (ranking) => {
  questionSection.style.display = "none";
  rankingList.style.display = "block";

  rankingList.innerHTML = "";
  ranking.slice(0, 5).forEach((player, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${player.name} - ${player.score} puntos`;
    rankingList.appendChild(li);
  });

  nextBtn.disabled = true; // No dejar avanzar manualmente
});

socket.on("players-update", (players) => {
  playersList.innerHTML = "";
  players.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    playersList.appendChild(li);
  });
});

socket.on("game-over", (ranking) => {
  questionSection.style.display = "none";
  nextBtn.style.display = "none";

  rankingList.style.display = "block";
  rankingList.innerHTML = "";
  ranking.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = `${player.name} - ${player.score} puntos`;
    rankingList.appendChild(li);
  });
});
