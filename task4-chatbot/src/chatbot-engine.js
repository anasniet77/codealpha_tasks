/**
 * Task 4 — Chatbot Engine
 * Retrieval-based NLP engine with fuzzy matching and optional AI fallback
 */
const knowledgeBase = require('./knowledge-base');

/**
 * Tokenize and normalize input text
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Remove common stop words for better matching
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'it', 'its', 'this', 'that',
  'and', 'or', 'but', 'not', 'so', 'if', 'then', 'else', 'when',
  'up', 'out', 'about', 'into', 'over', 'after', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
  'any', 'no', 'just', 'also', 'very', 'too', 'quite', 'rather',
  'please', 'tell', 'explain', 'know', 'want', 'need', 'like'
]);

function removeStopWords(tokens) {
  const filtered = tokens.filter(t => !STOP_WORDS.has(t));
  return filtered.length > 0 ? filtered : tokens; // fall back to original if all stop words
}

/**
 * Calculate similarity between user input and a pattern
 * Uses a combination of exact matching, partial matching, and Jaccard similarity
 */
function calculateSimilarity(inputTokens, patternTokens) {
  if (inputTokens.length === 0 || patternTokens.length === 0) return 0;

  const inputSet = new Set(inputTokens);
  const patternSet = new Set(patternTokens);

  // Exact match bonus
  const inputJoined = inputTokens.join(' ');
  const patternJoined = patternTokens.join(' ');

  if (inputJoined === patternJoined) return 1.0;

  // Check whole phrase match with word boundaries
  const inputPadded = ` ${inputJoined} `;
  const patternPadded = ` ${patternJoined} `;
  if (inputPadded.includes(patternPadded)) {
    const ratio = patternTokens.length / inputTokens.length;
    return Math.min(0.95, 0.4 + ratio * 0.55);
  }
  if (patternPadded.includes(inputPadded)) {
    const ratio = inputTokens.length / patternTokens.length;
    return Math.min(0.95, 0.4 + ratio * 0.55);
  }

  // Jaccard similarity
  const intersection = new Set([...inputSet].filter(x => patternSet.has(x)));
  const union = new Set([...inputSet, ...patternSet]);
  const jaccard = intersection.size / union.size;

  // Keyword overlap ratio (how many pattern words appear in input)
  const overlapRatio = intersection.size / patternSet.size;

  // Input coverage (how much of user's query is accounted for)
  const inputCoverage = intersection.size / inputSet.size;

  // Weighted combination
  return (jaccard * 0.3) + (overlapRatio * 0.5) + (inputCoverage * 0.2);
}

/**
 * Find the best matching response for user input
 */
function findBestMatch(userInput) {
  const inputTokens = tokenize(userInput);
  const inputFiltered = removeStopWords(inputTokens);

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    for (const pattern of entry.patterns) {
      const patternTokens = tokenize(pattern);
      const patternFiltered = removeStopWords(patternTokens);

      // Score with stop words
      const score1 = calculateSimilarity(inputTokens, patternTokens);
      // Score without stop words (intent matching)
      const score2 = calculateSimilarity(inputFiltered, patternFiltered);

      // Require content word overlap if both input and pattern have distinct content words
      const inputContentSet = new Set(inputFiltered);
      const patternContentSet = new Set(patternFiltered);
      const hasContentOverlap = [...patternContentSet].some(w => inputContentSet.has(w));

      let score = 0;
      if (hasContentOverlap) {
        score = Math.max(score1, score2);
      } else if (inputFiltered.length === inputTokens.length && patternFiltered.length === patternTokens.length) {
        // Neither had stop words (e.g. single-word or special terms)
        score = score1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }

  return { match: bestMatch, score: bestScore };
}

/**
 * Generate a fallback response for unknown questions
 */
function getFallbackResponse(userInput) {
  const suggestions = [
    "cloud computing",
    "cloud service models (IaaS, PaaS, SaaS)",
    "cloud providers (AWS, Azure, GCP)",
    "cloud security",
    "cloud pricing",
    "Docker and Kubernetes",
    "serverless computing",
    "cloud storage",
    "DevOps and CI/CD"
  ];

  return {
    response: `I'm not sure I understand that question. 🤔\n\nI specialize in cloud services topics. Try asking about:\n${suggestions.map(s => `• ${s}`).join('\n')}\n\nType **"help"** to see all topics I can discuss!`,
    category: 'fallback',
    score: 0
  };
}

/**
 * Process user message and generate response
 */
function processMessage(userInput) {
  if (!userInput || typeof userInput !== 'string' || userInput.trim().length === 0) {
    return {
      response: "Please type a message and I'll do my best to help! 💬",
      category: 'empty',
      score: 0
    };
  }

  const trimmed = userInput.trim();

  // Short greeting shortcuts
  if (/^(hi|hey|hello|yo)$/i.test(trimmed)) {
    const greeting = knowledgeBase.find(e => e.category === 'greeting');
    return { response: greeting.response, category: 'greeting', score: 1.0 };
  }

  const { match, score } = findBestMatch(trimmed);

  // Threshold for acceptance
  const CONFIDENCE_THRESHOLD = 0.3;

  if (match && score >= CONFIDENCE_THRESHOLD) {
    return {
      response: match.response,
      category: match.category,
      score: Math.round(score * 100) / 100
    };
  }

  return getFallbackResponse(trimmed);
}

/**
 * Optional: Call OpenAI API for generative response
 * Only used if OPENAI_API_KEY is set in environment
 */
async function getAIResponse(userInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    return null; // Fall back to retrieval-based
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are CloudHelp, a friendly assistant that answers questions about cloud computing services. Keep answers concise, informative, and use emojis. If the question is not about cloud services, politely redirect to cloud topics.'
          },
          { role: 'user', content: userInput }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0]) {
      return {
        response: data.choices[0].message.content,
        category: 'ai_generated',
        score: 1.0
      };
    }
    return null;
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    return null;
  }
}

module.exports = {
  processMessage,
  getAIResponse,
  findBestMatch,
  tokenize,
  removeStopWords,
  calculateSimilarity,
  getFallbackResponse
};
