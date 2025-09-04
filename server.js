const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let players = {}; // socket.id -> nombre
let scores = {}; // socket.id -> puntos
let currentQuestionIndex = -1;
let questionStartTime = null;
let questionTimeout = null;
let answersReceived = {}; // socket.id -> { time, correct }

// Tus preguntas (puedes editar o cargar desde JSON)
const questions = [
  {
    question: "¿Dónde se conocieron las novias?",
    answers: [
      "En Tinder",
      "De Fiesta",
      "En el Pádel",
      "Las presentaron unos amigos",
    ],
    correct: 2,
  },
  {
    question: "¿Dónde nació Ana?",
    answers: ["Granada", "Málaga", "Barcelona", "Bilbao"],
    correct: 1,
  },
  {
    question: "¿Qué ha estudiado Judith?",
    answers: [
      "Programación",
      "Grado de Educación Social",
      "Educación Infantil",
      "Todas son correctas",
    ],
    correct: 3,
  },
  {
    question: "¿Cuántos años llevan juntas?",
    answers: ["2", "5", "3", "4"],
    correct: 2,
  },
  {
    question: "Quién es más ordenada?",
    answers: ["Ana", "Judith"],
    correct: 0,
  },
  {
    question: "¿Dónde fue la pedida de mano?",
    answers: ["Tailandia", "Vietnam", "Granada", "Sofá de casa"],
    correct: 0,
  },
  {
    question: "¿Qué combinado bebe actualmente Ana?",
    answers: ["Ron Cola", "Gin-Tonic", "Whisky Cola", "Se lo bebe todo"],
    correct: 1,
  },
  {
    question: "Qué no puede faltar en su nevera?",
    answers: ["Cerveza", "Leche", "Tupper de Mamá", "Chocolate"],
    correct: 0,
  },
  {
    question: "¿Quién se mancha siempre?",
    answers: ["Ana", "Judith"],
    correct: 0,
  },
  {
    question: "¿Quién se más creativa?",
    answers: ["Ana", "Judith"],
    correct: 1,
  },
  {
    question: "Ana siempre saca buenas fotos",
    answers: ["Verdadero", "Falso"],
    correct: 1,
  },
  {
    question: "¿Quién se arrodilló?",
    answers: ["Ana", "Judith", "Nadie", "El vecino del 5º"],
    correct: 2,
  },
  {
    question: "Judith siempre se queja de todo",
    answers: ["Verdadero", "Falso"],
    correct: 0,
  },
  {
    question: "Qué cominda no nos gusta a ninguna de las dos?",
    answers: ["Chocolate", "Leche", "Lentejas", "Cocochas"],
    correct: 0,
  },
  {
    question: "¿Cuál es nuestra canción?",
    answers: ["Que bonito es querer", "Mami", "La correcta", "La promesa"],
    correct: 1,
  },
  {
    question: "¿Qué harian si ganaran la loteria?",
    answers: [
      "Comprarse una casa",
      "Desaparecer",
      "Viajar por el mundo",
      "Seguir trabajando con café gratis",
    ],
    correct: 2,
  },
  {
    question: "Ana nunca se acuerda de nada",
    answers: ["Verdadero", "Falso"],
    correct: 0,
  },
  {
    question: "¿Quién es más detallista?",
    answers: ["Ana", "Judith"],
    correct: 1,
  },
  {
    question: "¿Qué deporte no ha hecho Judith?",
    answers: [
      "Hockey",
      "Vela",
      "Hípica",
      "Fútbol",
      "Gimnadia artística",
      "Basquet",
    ],
    correct: 2,
  },
  {
    question: "¿Quién pierde siempre las discusiones?",
    answers: ["Judith", "Por supuesto, Judith", "Ana", "Ana nunca cede"],
    correct: 2,
  },
  {
    question: "¿Dónde nos vamos de viaje de novias?",
    answers: ["A las Maldivas", "Sri Lanka", "Al caribe", "Colombia"],
    correct: 3,
  },
];

// Enviar la siguiente pregunta
function sendNextQuestion() {
  clearTimeout(questionTimeout);
  currentQuestionIndex++;

  if (currentQuestionIndex < questions.length) {
    const question = questions[currentQuestionIndex];
    questionStartTime = Date.now();
    answersReceived = {};

    io.emit("new-question", question);

    // Avanza automáticamente en 15 segundos
    questionTimeout = setTimeout(() => {
      io.emit("show-ranking", getRanking());
      setTimeout(sendNextQuestion, 5000);
    }, 15000);
  } else {
    io.emit("game-over", getRanking());
  }
}

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Jugador se une
  socket.on("player-join", (name) => {
    players[socket.id] = name;
    scores[socket.id] = scores[socket.id] || 0;
    console.log(`Jugador unido: ${name}`);
    io.emit("players-update", Object.values(players));
    io.emit("scores-update", getRanking());
    socket.playerId = socket.id;
  });

  // Anfitrión lanza siguiente pregunta (opcional si usas auto)
  socket.on("next-question", () => {
    sendNextQuestion();
  });

  // Jugador responde
  socket.on("answer", (answerIndex) => {
    const now = Date.now();
    const playerId = socket.playerId;
    if (!playerId || answersReceived[playerId]) return;

    const currentQ = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQ.correct;
    const timeTaken = (now - questionStartTime) / 1000;

    answersReceived[playerId] = { time: timeTaken, correct: isCorrect };

    if (isCorrect) {
      const speedBonus = Math.max(0, 100 - Math.floor(timeTaken * 5));
      scores[playerId] = (scores[playerId] || 0) + speedBonus;
    }

    io.emit("scores-update", getRanking());

    if (Object.keys(answersReceived).length === Object.keys(players).length) {
      // TODOS RESPONDIERON
      clearTimeout(questionTimeout); // cancelar timer normal

      io.emit("show-ranking", getRanking()); // mostrar ranking inmediatamente

      // esperar 10 segundos antes de siguiente pregunta
      setTimeout(() => {
        sendNextQuestion();
      }, 10000);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    delete players[socket.id];
    delete scores[socket.id];
    io.emit("players-update", Object.values(players));
    io.emit("scores-update", getRanking());
  });
});

function getRanking() {
  return Object.keys(scores)
    .map((id) => ({ name: players[id], score: scores[id] }))
    .sort((a, b) => b.score - a.score);
}
// ...existing code...

const PORT = process.env.PORT || 3000;
const ip = "localhost"; // Puedes usar "localhost" o "127.0.0.1"

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://${ip}:${PORT}`);
});

// ...existing code...
