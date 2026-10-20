/**
 * Task 4 — Chatbot Test Suite
 * Tests response accuracy, usability, categorization, confidence scoring,
 * fallback responses, and input validation.
 */
const {
  processMessage,
  findBestMatch,
  tokenize,
  removeStopWords,
  calculateSimilarity,
  getFallbackResponse
} = require('../src/chatbot-engine');
const knowledgeBase = require('../src/knowledge-base');

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.log(`  ❌ ${testName}`);
  }
}

function section(name) {
  console.log(`\n━━━ ${name} ━━━`);
}

console.log('🧪 Task 4 — Chatbot Engine Tests\n');

// ──────────────────────────────────────────
section('1. Tokenization & NLP Utilities');
// ──────────────────────────────────────────
const tokens = tokenize('Hello, Cloud Computing! How are you?');
assert(Array.isArray(tokens) && tokens.includes('cloud') && tokens.includes('computing'), 'Tokenize splits and normalizes lowercase words without punctuation');

const filtered = removeStopWords(['what', 'is', 'docker', 'and', 'kubernetes']);
assert(filtered.includes('docker') && filtered.includes('kubernetes') && !filtered.includes('what'), 'removeStopWords removes common query words');

const simIdentical = calculateSimilarity(['docker', 'container'], ['docker', 'container']);
assert(simIdentical === 1.0, 'Identical tokens give similarity score of 1.0');

const simDiff = calculateSimilarity(['banana', 'fruit'], ['docker', 'kubernetes']);
assert(simDiff === 0, 'Completely different tokens give similarity score of 0');

// ──────────────────────────────────────────
section('2. Greetings & Edge Cases');
// ──────────────────────────────────────────
const emptyRes = processMessage('');
assert(emptyRes.category === 'empty', 'Empty string returns empty category prompt');

const nullRes = processMessage(null);
assert(nullRes.category === 'empty', 'Null input returns empty category prompt');

const whitespaceRes = processMessage('    ');
assert(whitespaceRes.category === 'empty', 'Whitespace-only input returns empty category prompt');

const helloRes = processMessage('hello');
assert(helloRes.category === 'greeting' && helloRes.score === 1.0, 'Direct greeting "hello" matches greeting category');

const hiRes = processMessage('Hi');
assert(hiRes.category === 'greeting', 'Greeting "Hi" is case-insensitive');

// ──────────────────────────────────────────
section('3. Predefined Domain Knowledge Q&A');
// ──────────────────────────────────────────
const q1 = processMessage('What is cloud computing?');
assert(q1.category === 'cloud' && q1.score > 0.5, 'Understands "What is cloud computing?" with high confidence');

const q2 = processMessage('Explain IaaS PaaS SaaS');
assert(q2.category === 'cloud' && q2.response.includes('IaaS'), 'Understands service models question');

const q3 = processMessage('Tell me about AWS, Azure and GCP');
assert(q3.category === 'cloud' && q3.response.includes('Amazon Web Services'), 'Matches cloud providers query');

const q4 = processMessage('How does cloud pricing work?');
assert(q4.category === 'pricing', 'Matches cloud pricing query');

const q5 = processMessage('What is Docker containerization?');
assert(q5.category === 'containers' && q5.response.includes('Docker'), 'Matches Docker inquiry');

const q6 = processMessage('Explain Kubernetes orchestration');
assert(q6.category === 'containers' && q6.response.includes('Kubernetes'), 'Matches Kubernetes inquiry');

const q7 = processMessage('What is serverless computing like AWS Lambda?');
assert(q7.category === 'serverless' && q7.response.includes('Serverless'), 'Matches serverless computing query');

const q8 = processMessage('Is cloud secure?');
assert(q8.category === 'security', 'Matches cloud security query');

// ──────────────────────────────────────────
section('4. Unknown Queries & Fallback Response');
// ──────────────────────────────────────────
const unknownRes = processMessage('What is the recipe for chocolate chip pancakes with strawberries?');
assert(unknownRes.category === 'fallback' && unknownRes.score === 0, 'Irrelevant off-topic query triggers fallback response');

const gibberishRes = processMessage('xyzabc12349876qwerty');
assert(gibberishRes.category === 'fallback', 'Gibberish string triggers fallback response');

const fallbackObj = getFallbackResponse('some random input');
assert(fallbackObj.category === 'fallback' && fallbackObj.response.includes('specialize in cloud services'), 'Fallback response provides helpful suggestions');

// ──────────────────────────────────────────
section('5. Knowledge Base Coverage & Integrity');
// ──────────────────────────────────────────
assert(knowledgeBase.length >= 15, `Knowledge base has sufficient domain coverage (found ${knowledgeBase.length} topics)`);

const allHavePatternsAndResponse = knowledgeBase.every(k => 
  Array.isArray(k.patterns) && k.patterns.length > 0 && typeof k.response === 'string' && k.response.length > 0
);
assert(allHavePatternsAndResponse, 'Every knowledge base entry has patterns and valid responses');

console.log(`\n════════════════════════════════════════`);
console.log(`Task 4 Chatbot Test Results: ${passed}/${total} passed (${failed} failed)`);
console.log(`════════════════════════════════════════\n`);

if (failed > 0) {
  process.exit(1);
}
