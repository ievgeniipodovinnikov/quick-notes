const STORAGE_KEY = 'quick_notes';
const DRAFT_KEY = 'quick_notes_draft';
const THEME_KEY = 'quick_notes_theme';

let notes = [];
let filteredNotes = [];
let currentSearchQuery = '';

async function loadNotes() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  notes = result[STORAGE_KEY] || [];
  filteredNotes = [...notes];
  renderNotes();
}

async function saveNotes() {
  await chrome.storage.local.set({ [STORAGE_KEY]: notes });
  applySearchFilter();
}

async function saveDraft(text) {
  await chrome.storage.local.set({ [DRAFT_KEY]: text });
}

async function loadDraft() {
  const result = await chrome.storage.local.get([DRAFT_KEY]);
  return result[DRAFT_KEY] || '';
}

async function clearDraft() {
  await chrome.storage.local.remove([DRAFT_KEY]);
}

// Тема
async function loadTheme() {
  const result = await chrome.storage.local.get([THEME_KEY]);
  const theme = result[THEME_KEY] || 'dark';
  document.body.parentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

async function saveTheme(theme) {
  await chrome.storage.local.set({ [THEME_KEY]: theme });
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('#theme-toggle i');
  if (theme === 'dark') {
    icon.className = 'fas fa-sun';
  } else {
    icon.className = 'fas fa-moon';
  }
}

function toggleTheme() {
  const currentTheme = document.body.parentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.parentElement.setAttribute('data-theme', newTheme);
  saveTheme(newTheme);
  updateThemeIcon(newTheme);
}

function applySearchFilter() {
  if (!currentSearchQuery.trim()) {
    filteredNotes = [...notes];
  } else {
    const query = currentSearchQuery.toLowerCase().trim();
    filteredNotes = notes.filter(note => 
      note.text.toLowerCase().includes(query)
    );
  }
  renderNotes();
}

function highlightSearchTerm(text) {
  if (!currentSearchQuery.trim()) return escapeHtml(text);
  
  const query = currentSearchQuery.toLowerCase().trim();
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  return escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
}

function renderNotes() {
  const container = document.getElementById('notes-list');
  
  if (filteredNotes.length === 0) {
    if (notes.length === 0) {
      container.innerHTML = '<div class="empty-state">📭 No notes yet. Write something above.</div>';
    } else {
      container.innerHTML = '<div class="empty-state">🔍 No matching notes found</div>';
    }
    return;
  }
  
  container.innerHTML = filteredNotes.map((note, idx) => {
    const originalIndex = notes.findIndex(n => n.id === note.id);
    return `
      <div class="note-item" data-index="${originalIndex}">
        <div class="note-text">${highlightSearchTerm(note.text)}</div>
        <div class="note-footer">
          <div class="note-date">📅 ${formatDate(note.timestamp)}</div>
          <button class="copy-note" data-index="${originalIndex}" data-text="${escapeHtml(note.text)}">
            <i class="far fa-copy"></i>
          </button>
        </div>
        <button class="delete-note" data-index="${originalIndex}">×</button>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.delete-note').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      deleteNote(index);
    });
  });
  
  document.querySelectorAll('.copy-note').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = btn.dataset.text;
      await copyToClipboard(text);
      showToast('📋 Copied to clipboard');
    });
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}

function deleteNote(index) {
  notes.splice(index, 1);
  saveNotes();
  applySearchFilter();
  showToast('🗑️ Note deleted');
}

async function addNote(text) {
  if (!text.trim()) {
    showToast('⚠️ Cannot save empty note');
    return false;
  }
  
  const note = {
    id: Date.now(),
    text: text.trim(),
    timestamp: Date.now()
  };
  
  notes.unshift(note);
  await saveNotes();
  await clearDraft();
  return true;
}

async function clearAllNotes() {
  if (notes.length === 0) return;
  
  if (confirm('Delete all notes? This cannot be undone.')) {
    notes = [];
    await saveNotes();
    applySearchFilter();
    showToast('🗑️ All notes deleted');
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
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-tertiary);
    color: var(--accent);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 11px;
    z-index: 1000;
    animation: fadeOut 1.5s ease-out forwards;
    white-space: nowrap;
    font-weight: 500;
    border: 1px solid var(--border-color);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}

document.getElementById('note-input').addEventListener('input', (e) => {
  saveDraft(e.target.value);
});

document.getElementById('save-note').addEventListener('click', async () => {
  const input = document.getElementById('note-input');
  const text = input.value;
  
  const success = await addNote(text);
  if (success) {
    input.value = '';
    currentSearchQuery = '';
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search').style.display = 'none';
    applySearchFilter();
    showToast('✅ Note saved');
  }
});

document.getElementById('clear-input').addEventListener('click', async () => {
  document.getElementById('note-input').value = '';
  await saveDraft('');
  showToast('🧹 Input cleared');
});

document.getElementById('clear-all').addEventListener('click', clearAllNotes);

document.getElementById('note-input').addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    document.getElementById('save-note').click();
  }
});

document.getElementById('search-input').addEventListener('input', (e) => {
  currentSearchQuery = e.target.value;
  const clearBtn = document.getElementById('clear-search');
  clearBtn.style.display = currentSearchQuery ? 'flex' : 'none';
  applySearchFilter();
});

document.getElementById('clear-search').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  currentSearchQuery = '';
  document.getElementById('clear-search').style.display = 'none';
  applySearchFilter();
});

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

async function init() {
  await loadNotes();
  await loadTheme();
  const draft = await loadDraft();
  const input = document.getElementById('note-input');
  if (draft) {
    input.value = draft;
  }
}

init();