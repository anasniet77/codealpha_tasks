/**
 * Task 4 — Chatbot
 * Express server
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { processMessage, getAIResponse } = require('./chatbot-engine');

const app = express();
const PORT = process.env.TASK4_PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Health check ─────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'chatbot',
    aiEnabled: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'),
    timestamp: new Date().toISOString()
  });
});

// ── Chat endpoint ────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // First try retrieval-based response
    const retrievalResult = processMessage(message);

    // If retrieval confidence is low and AI is enabled, try AI
    if (retrievalResult.category === 'fallback') {
      const aiResult = await getAIResponse(message);
      if (aiResult) {
        return res.json({
          response: aiResult.response,
          category: aiResult.category,
          confidence: aiResult.score,
          engine: 'ai'
        });
      }
    }

    res.json({
      response: retrievalResult.response,
      category: retrievalResult.category,
      confidence: retrievalResult.score,
      engine: 'retrieval'
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      response: "I'm having trouble right now. Please try again in a moment.",
      category: 'error',
      confidence: 0
    });
  }
});

// ── Get chat suggestions ─────────────────
app.get('/api/suggestions', (req, res) => {
  res.json({
    suggestions: [
      "What is cloud computing?",
      "Explain IaaS, PaaS, and SaaS",
      "What are the best cloud providers?",
      "How does cloud pricing work?",
      "Cloud security best practices",
      "What is Docker?",
      "Explain Kubernetes",
      "What is serverless computing?",
      "Cloud storage options",
      "How to migrate to the cloud?"
    ]
  });
});

// ── Serve frontend ───────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Task 4] Chatbot running on http://localhost:${PORT}`);
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      console.log('[Task 4] AI mode enabled (OpenAI)');
    } else {
      console.log('[Task 4] Running in retrieval-based mode (no AI key configured)');
    }
  });
}

module.exports = app;
