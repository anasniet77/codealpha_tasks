/**
 * Task 4 — Chatbot Frontend Application
 */
const API = '';

document.addEventListener('DOMContentLoaded', () => {
  loadSuggestions();
  setupChatForm();
});

// ── Load suggestion chips ────────────────
async function loadSuggestions() {
  try {
    const res = await fetch(`${API}/api/suggestions`);
    const data = await res.json();
    const grid = document.getElementById('suggestions-grid');

    grid.innerHTML = data.suggestions.map(s =>
      `<button class="suggestion-chip" onclick="sendSuggestion(this)">${escHtml(s)}</button>`
    ).join('');
  } catch (err) {
    console.error('Failed to load suggestions:', err);
  }
}

// ── Send suggestion ──────────────────────
function sendSuggestion(el) {
  const text = el.textContent;
  document.getElementById('chat-input').value = text;
  sendMessage(text);

  // Hide suggestions after first use
  const suggestionsEl = document.getElementById('suggestions');
  if (suggestionsEl) suggestionsEl.style.display = 'none';
}

// ── Setup chat form ──────────────────────
function setupChatForm() {
  const form = document.getElementById('chat-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Hide suggestions on first message
    const suggestionsEl = document.getElementById('suggestions');
    if (suggestionsEl) suggestionsEl.style.display = 'none';

    sendMessage(message);
    input.value = '';
  });
}

// ── Send message ─────────────────────────
async function sendMessage(message) {
  const chatBody = document.getElementById('chat-body');
  const sendBtn = document.getElementById('send-btn');

  // Add user message
  appendMessage('user', message);

  // Add typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'message bot-message';
  typingEl.id = 'typing-indicator';
  typingEl.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  chatBody.appendChild(typingEl);
  scrollToBottom();

  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await res.json();

    // Remove typing indicator
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();

    // Add bot response
    appendMessage('bot', data.response, data.confidence, data.engine, data.category);
  } catch (err) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
    appendMessage('bot', "Sorry, I'm having trouble connecting. Please try again.", 0, 'error', 'error');
  } finally {
    sendBtn.disabled = false;
    document.getElementById('chat-input').focus();
  }
}

// ── Append message to chat ───────────────
function appendMessage(sender, content, confidence, engine, category) {
  const chatBody = document.getElementById('chat-body');
  const div = document.createElement('div');
  div.className = `message ${sender}-message`;

  const avatar = sender === 'bot' ? '🤖' : '👤';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Parse markdown-like formatting for bot messages
  let htmlContent = content;
  if (sender === 'bot') {
    htmlContent = formatBotMessage(content);
  } else {
    htmlContent = `<p>${escHtml(content)}</p>`;
  }

  // Confidence badge
  let confidenceBadge = '';
  if (sender === 'bot' && confidence !== undefined && category !== 'greeting' && category !== 'goodbye' && category !== 'thanks') {
    const level = confidence >= 0.7 ? 'high' : confidence >= 0.4 ? 'medium' : 'low';
    const label = confidence >= 0.7 ? '✓ High confidence' : confidence >= 0.4 ? '~ Moderate match' : '? Low confidence';
    confidenceBadge = `<span class="confidence-badge confidence-${level}">${label}${engine === 'ai' ? ' (AI)' : ''}</span>`;
  }

  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-bubble">${htmlContent}</div>
      <div class="message-time">${time} ${confidenceBadge}</div>
    </div>
  `;

  chatBody.appendChild(div);
  scrollToBottom();
}

// ── Format bot message (basic markdown) ──
function formatBotMessage(text) {
  // Split into lines and process
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (let line of lines) {
    // Bold: **text**
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code: `text`
    line = line.replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:0.85em;">$1</code>');

    if (line.startsWith('• ') || line.startsWith('- ')) {
      if (!inList) { html += '<ul style="margin:4px 0;padding-left:16px;">'; inList = true; }
      html += `<li style="margin:2px 0;">${line.substring(2)}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (line.trim() === '') {
        html += '<br>';
      } else {
        html += `<p>${line}</p>`;
      }
    }
  }
  if (inList) html += '</ul>';

  return html;
}

// ── Scroll to bottom ─────────────────────
function scrollToBottom() {
  const chatBody = document.getElementById('chat-body');
  requestAnimationFrame(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  });
}

// ── HTML escape ──────────────────────────
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
