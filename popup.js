const STORAGE_KEY = 'quick_notes';

let notes = [];

async function loadNotes() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  notes = result[STORAGE_KEY] || [];
  renderNotes();
}

async function saveNotes() {
  await chrome.storage.local.set({ [STORAGE_KEY]: notes });
  renderNotes();
}

function renderNotes() {
  const container = document.getElementById('notes-list');
  
  if (notes.length === 0) {
    container.innerHTML = '<div class="empty-state">📭 No notes yet. Write something above.</div>';
    return;
  }
  
  container.innerHTML = notes.map((note, index) => `
    <div class="note-item" data-index="${index}">
      <div class="note-text">${escapeHtml(note.text)}</div>
      <div class="note-date">📅 ${formatDate(note.timestamp)}</div>
      <button class="delete-note" data-index="${index}">×</button>
    </div>
  `).join('');
  
  document.querySelectorAll('.delete-note').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      deleteNote(index);
    });
  });
}

function deleteNote(index) {
  notes.splice(index, 1);
  saveNotes();
  showToast('Note deleted');
}

async function addNote(text) {
  if (!text.trim()) {
    showToast('Cannot save empty note');
    return false;
  }
  
  const note = {
    id: Date.now(),
    text: text.trim(),
    timestamp: Date.now()
  };
  
  notes.unshift(note);
  await saveNotes();
  return true;
}

async function clearAllNotes() {
  if (notes.length === 0) return;
  
  if (confirm('Delete all notes? This cannot be undone.')) {
    notes = [];
    await saveNotes();
    showToast('All notes deleted');
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #2c2c2e;
    color: white;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 11px;
    z-index: 1000;
    animation: fadeOut 1.5s ease-out forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}

document.getElementById('save-note').addEventListener('click', async () => {
  const input = document.getElementById('note-input');
  const text = input.value;
  
  const success = await addNote(text);
  if (success) {
    input.value = '';
    showToast('Note saved');
  }
});

document.getElementById('clear-input').addEventListener('click', () => {
  document.getElementById('note-input').value = '';
});

document.getElementById('clear-all').addEventListener('click', clearAllNotes);

document.getElementById('note-input').addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    document.getElementById('save-note').click();
  }
});

loadNotes();