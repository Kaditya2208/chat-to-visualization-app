// backend/index.js

// --- IMPORTS (From Phase 1 & 3) ---
// backend/index.js
require('dotenv').config(); 

// --- IMPORTS ---
// ... rest of your file
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { generateExplanationAndVisualization } = require('./llmService'); // Make sure this import is here

// --- APP SETUP (From Phase 1) ---
const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// --- IN-MEMORY STORAGE & SSE CLIENTS (From Phase 2 & 4) ---
let questions = [];
let answers = {};
// This is from Phase 4, Point 1
let clients = []; 

// --- HELPER FUNCTIONS ---
// PHASE 4, POINT 3: Create a Broadcast Function
// This function sends data to all connected clients. Place it before your routes.
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  console.log(`Broadcasting event: ${event}`);
  clients.forEach(client => client.res.write(message));
}

// --- API ROUTES ---

// Basic route from Phase 1
app.get('/', (req, res) => {
  res.send('Chat-to-Visualization API is running!');
});

// Routes from Phase 2
app.get('/api/questions', (req, res) => {
  res.json(questions);
});

app.get('/api/answers/:id', (req, res) => {
  const answer = answers[req.params.id];
  if (answer) {
    res.json(answer);
  } else {
    res.status(404).send('Answer not found');
  }
});

// PHASE 4, POINT 2: Implement the /api/stream Endpoint
// This route establishes and maintains the SSE connection.
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  console.log(`Client ${clientId} connected. Total clients: ${clients.length}`);

  // Keep connection open by sending a comment
  const keepAliveInterval = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  req.on('close', () => {
    console.log(`Client ${clientId} disconnected.`);
    clients = clients.filter(client => client.id !== clientId);
    clearInterval(keepAliveInterval);
  });
});

// PHASE 4, POINT 4: Update the POST /api/questions Endpoint
// This NEW async version REPLACES the old one from Phase 2.
// It calls the LLM service and then broadcasts the results.
app.post('/api/questions', async (req, res) => {
  const { userId, question } = req.body;

  try {
    const questionId = `q_${uuidv4()}`;
    const answerId = `a_${uuidv4()}`;

    // Create question and broadcast immediately for a responsive UI
    const newQuestion = { id: questionId, userId, question, answerId };
    questions.push(newQuestion);
    broadcast('question_created', newQuestion);

    // Respond to the initial HTTP request so the frontend doesn't hang
    res.status(201).json({ questionId, answerId });

    // Now, do the long-running LLM task
    console.log('Generating response from LLM...');
    const llmResponse = await generateExplanationAndVisualization(question);

    // Create the final answer and broadcast it
    const newAnswer = { id: answerId, ...llmResponse };
    answers[answerId] = newAnswer;
    broadcast('answer_created', newAnswer);

    console.log('Successfully processed question and broadcasted answer.');

  } catch (error) {
    console.error('Failed to process question:', error);
    // You might want to broadcast an error event here as well
  }
});

// --- START SERVER (From Phase 1) ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});