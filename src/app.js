const TOKEN_KEY = 'i-notes-token'
const USERS_KEY = 'i-notes-users'
const NOTES_KEY = 'i-notes-notes'
const DEFAULT_CATEGORIES = ['Personal', 'Work', 'Ideas', 'Archive']

// Simple hash function for passwords (NOT for production - for demo only)
const hashPassword = (password) => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// State management
const state = {
  user: null,
  notes: [],
  authMode: 'login',
  authName: '',
  authEmail: '',
  authPassword: '',
  filterCategory: 'All',
  noteTitle: '',
  noteContent: '',
  noteCategory: 'Personal',
  activeNoteId: null,
  authMessage: '',
}

// Storage helpers
const getUsers = () => {
  const data = localStorage.getItem(USERS_KEY)
  return data ? JSON.parse(data) : {}
}

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const getUserNotes = (userId) => {
  const notes = localStorage.getItem(NOTES_KEY)
  const allNotes = notes ? JSON.parse(notes) : {}
  return allNotes[userId] || []
}

const saveUserNotes = (userId, notes) => {
  const allNotes = localStorage.getItem(NOTES_KEY)
  const notesData = allNotes ? JSON.parse(allNotes) : {}
  notesData[userId] = notes
  localStorage.setItem(NOTES_KEY, JSON.stringify(notesData))
}

const getToken = () => localStorage.getItem(TOKEN_KEY)
const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token)
const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Initialize app on page load
const initialize = () => {
  const token = getToken()
  if (token) {
    const users = getUsers()
    // Find user by token (token is just the email for this simple implementation)
    const user = Object.values(users).find((u) => u.email === token)
    if (user) {
      state.user = user
      state.notes = getUserNotes(user.email)
    } else {
      clearToken()
    }
  }
  render()
}

// Message handler
const setMessage = (message) => {
  state.authMessage = message
  render()
  setTimeout(() => {
    state.authMessage = ''
    render()
  }, 4000)
}

// Auth handlers
const handleAuthSubmit = async (e) => {
  e.preventDefault()
  state.authMessage = ''

  const email = state.authEmail.trim().toLowerCase()
  const password = state.authPassword.trim()

  if (!email || !password || (state.authMode === 'register' && !state.authName.trim())) {
    setMessage('Please complete all fields.')
    return
  }

  const users = getUsers()

  if (state.authMode === 'login') {
    // Login
    const user = users[email]
    if (!user || hashPassword(password) !== user.password) {
      setMessage('Invalid email or password.')
      return
    }
    // Login successful
    saveToken(email)
    state.user = user
    state.notes = getUserNotes(email)
    state.authEmail = ''
    state.authPassword = ''
    setMessage(`Welcome back, ${user.name}!`)
  } else {
    // Register
    if (users[email]) {
      setMessage('Email already registered.')
      return
    }
    const newUser = {
      email,
      name: state.authName.trim(),
      password: hashPassword(password),
    }
    users[email] = newUser
    saveUsers(users)
    saveUserNotes(email, [])
    saveToken(email)
    state.user = newUser
    state.notes = []
    state.authName = ''
    state.authEmail = ''
    state.authPassword = ''
    setMessage(`Account created for ${newUser.name}.`)
  }
}

const handleSignOut = () => {
  clearToken()
  state.user = null
  state.notes = []
  state.filterCategory = 'All'
  state.activeNoteId = null
  state.noteTitle = ''
  state.noteContent = ''
  state.noteCategory = 'Personal'
  setMessage('Signed out successfully.')
}

const clearEditor = () => {
  state.activeNoteId = null
  state.noteTitle = ''
  state.noteContent = ''
  state.noteCategory = 'Personal'
  setMessage('Ready for a new note.')
}

const saveNote = () => {
  if (!state.noteTitle.trim() || !state.noteContent.trim()) {
    setMessage('Please add both a title and content.')
    return
  }

  const newNote = {
    id: state.activeNoteId || Date.now(),
    title: state.noteTitle.trim(),
    content: state.noteContent.trim(),
    category: state.noteCategory.trim() || 'Personal',
    createdAt: new Date().toISOString(),
  }

  if (state.activeNoteId) {
    // Update existing note
    const index = state.notes.findIndex((n) => n.id === state.activeNoteId)
    if (index !== -1) {
      state.notes[index] = { ...state.notes[index], ...newNote }
    }
    saveUserNotes(state.user.email, state.notes)
    state.activeNoteId = null
    state.noteTitle = ''
    state.noteContent = ''
    state.noteCategory = 'Personal'
    setMessage('Note updated successfully.')
  } else {
    // Create new note
    state.notes.push(newNote)
    saveUserNotes(state.user.email, state.notes)
    state.noteTitle = ''
    state.noteContent = ''
    state.noteCategory = 'Personal'
    setMessage('Note saved successfully.')
  }
}

const editNote = (note) => {
  state.activeNoteId = note.id
  state.noteTitle = note.title
  state.noteContent = note.content
  state.noteCategory = note.category
  setMessage('Editing note. Save to update.')
}

const deleteNote = (id) => {
  state.notes = state.notes.filter((n) => n.id !== id)
  saveUserNotes(state.user.email, state.notes)
  if (state.activeNoteId === id) {
    clearEditor()
  }
  setMessage('Note deleted.')
}

// Get categories
const getCategories = () => {
  const all = ['All', ...DEFAULT_CATEGORIES]
  state.notes.forEach((note) => {
    if (note.category && !all.includes(note.category)) {
      all.push(note.category)
    }
  })
  return all
}

const getFilteredNotes = () => {
  return state.notes.filter(
    (note) => state.filterCategory === 'All' || note.category === state.filterCategory,
  )
}

// Rendering functions
const renderAuthScreen = () => {
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="logo-container">
          <svg class="logo" viewBox="0 0 64 64" width="48" height="48">
            <rect x="12" y="8" width="40" height="48" rx="4" fill="none" stroke="#3846ff" stroke-width="2"/>
            <line x1="12" y1="20" x2="52" y2="20" stroke="#3846ff" stroke-width="2"/>
            <line x1="16" y1="28" x2="48" y2="28" stroke="#3846ff" stroke-width="1.5" opacity="0.6"/>
            <line x1="16" y1="36" x2="48" y2="36" stroke="#3846ff" stroke-width="1.5" opacity="0.6"/>
            <line x1="16" y1="44" x2="40" y2="44" stroke="#3846ff" stroke-width="1.5" opacity="0.6"/>
            <text x="32" y="18" font-size="8" font-weight="bold" fill="#3846ff" text-anchor="middle" dominant-baseline="middle">i</text>
          </svg>
        </div>
        <h1>i-notes</h1>
        <p class="auth-description">Sign in or register to store your notes locally.</p>

        <div class="auth-toggle">
          <button
            type="button"
            class="auth-toggle-btn ${state.authMode === 'login' ? 'active' : ''}"
            data-mode="login"
          >
            Login
          </button>
          <button
            type="button"
            class="auth-toggle-btn ${state.authMode === 'register' ? 'active' : ''}"
            data-mode="register"
          >
            Register
          </button>
        </div>

        <form class="auth-form" id="auth-form">
          ${state.authMode === 'register' ? `
            <label>
              Name
              <input
                type="text"
                id="auth-name"
                placeholder="Your name"
                value="${state.authName}"
              />
            </label>
          ` : ''}

          <label>
            Email
            <input
              type="email"
              id="auth-email"
              placeholder="you@example.com"
              value="${state.authEmail}"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              id="auth-password"
              placeholder="Secure password"
              value="${state.authPassword}"
            />
          </label>

          <button type="submit" class="primary-button">
            ${state.authMode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>

        ${state.authMessage ? `<p class="auth-message">${state.authMessage}</p>` : ''}
      </div>
    </div>
  `
}

const renderAppScreen = () => {
  const categories = getCategories()
  const filteredNotes = getFilteredNotes()

  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-brand">
          <svg class="logo-small" viewBox="0 0 64 64" width="32" height="32">
            <rect x="12" y="8" width="40" height="48" rx="4" fill="none" stroke="#3846ff" stroke-width="2"/>
            <line x1="12" y1="20" x2="52" y2="20" stroke="#3846ff" stroke-width="2"/>
            <line x1="16" y1="28" x2="48" y2="28" stroke="#3846ff" stroke-width="1.5" opacity="0.6"/>
            <line x1="16" y1="36" x2="48" y2="36" stroke="#3846ff" stroke-width="1.5" opacity="0.6"/>
            <line x1="16" y1="44" x2="40" y2="44" stroke="#3846ff" stroke-width="1.5" opacity="0.6"/>
            <text x="32" y="18" font-size="8" font-weight="bold" fill="#3846ff" text-anchor="middle" dominant-baseline="middle">i</text>
          </svg>
          <div>
            <p class="brand">i-notes</p>
            <span class="user-label">${state.user.name}</span>
          </div>
        </div>
        <button type="button" class="secondary-button" id="sign-out-btn">
          Sign out
        </button>
      </header>

      <main class="workspace">
        <section class="sidebar">
          <div class="user-summary">
            <p class="summary-title">Your notes</p>
            <p class="summary-detail">
              ${state.notes.length} saved note${state.notes.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div class="category-panel">
            <div class="panel-header">
              <h2>Categories</h2>
              <span>${filteredNotes.length}</span>
            </div>
            <div class="category-list">
              ${categories.map((category) => `
                <button
                  type="button"
                  class="category-button ${state.filterCategory === category ? 'active' : ''}"
                  data-category="${category}"
                >
                  ${category}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="usage-info">
            <p>Notes are saved locally in your browser.</p>
          </div>
        </section>

        <section class="editor-panel">
          <div class="editor-header">
            <h2>${state.activeNoteId ? 'Edit note' : 'New note'}</h2>
          </div>

          <div class="editor-form">
            <label>
              Title
              <input
                type="text"
                id="note-title"
                placeholder="Note title"
                value="${state.noteTitle}"
              />
            </label>

            <label>
              Category
              <select id="note-category" value="${state.noteCategory}">
                ${DEFAULT_CATEGORIES.map((cat) => `
                  <option value="${cat}" ${state.noteCategory === cat ? 'selected' : ''}>${cat}</option>
                `).join('')}
              </select>
            </label>

            <label>
              Content
              <textarea
                id="note-content"
                placeholder="Write your note here..."
                rows="10"
              >${state.noteContent}</textarea>
            </label>

            <div class="editor-actions">
              <button type="button" class="primary-button" id="save-note-btn">
                ${state.activeNoteId ? 'Update note' : 'Save note'}
              </button>
              ${state.activeNoteId ? `
                <button type="button" class="secondary-button" id="clear-editor-btn">
                  Clear
                </button>
              ` : ''}
            </div>
          </div>

          ${state.authMessage ? `<p class="editor-message">${state.authMessage}</p>` : ''}
        </section>

        <section class="note-list">
          <div class="list-header">
            <h2>Notes</h2>
          </div>

          <div class="notes-container">
            ${filteredNotes.length === 0 ? `
              <p class="empty-message">No notes in this category.</p>
            ` : filteredNotes.map((note) => `
              <div class="note-item ${state.activeNoteId === note.id ? 'active' : ''}" data-note-id="${note.id}">
                <div class="note-header">
                  <h3>${note.title}</h3>
                  <span class="note-category">${note.category}</span>
                </div>
                <p class="note-preview">${note.content.substring(0, 100)}...</p>
                <div class="note-actions">
                  <button type="button" class="edit-note-btn" data-note-id="${note.id}">Edit</button>
                  <button type="button" class="delete-note-btn" data-note-id="${note.id}">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </main>
    </div>
  `
}

const render = () => {
  const app = document.getElementById('app')
  app.innerHTML = state.user ? renderAppScreen() : renderAuthScreen()
  attachEventListeners()
}

const attachEventListeners = () => {
  if (!state.user) {
    // Auth screen events
    const authForm = document.getElementById('auth-form')
    if (authForm) {
      authForm.addEventListener('submit', handleAuthSubmit)
    }

    const toggleButtons = document.querySelectorAll('.auth-toggle-btn')
    toggleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.authMode = btn.dataset.mode
        render()
      })
    })

    const nameInput = document.getElementById('auth-name')
    if (nameInput) {
      nameInput.addEventListener('change', (e) => {
        state.authName = e.target.value
      })
    }

    const emailInput = document.getElementById('auth-email')
    if (emailInput) {
      emailInput.addEventListener('change', (e) => {
        state.authEmail = e.target.value
      })
    }

    const passwordInput = document.getElementById('auth-password')
    if (passwordInput) {
      passwordInput.addEventListener('change', (e) => {
        state.authPassword = e.target.value
      })
    }
  } else {
    // App screen events
    const signOutBtn = document.getElementById('sign-out-btn')
    if (signOutBtn) {
      signOutBtn.addEventListener('click', handleSignOut)
    }

    const categoryButtons = document.querySelectorAll('.category-button')
    categoryButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.filterCategory = btn.dataset.category
        render()
      })
    })

    const titleInput = document.getElementById('note-title')
    if (titleInput) {
      titleInput.addEventListener('change', (e) => {
        state.noteTitle = e.target.value
      })
    }

    const categorySelect = document.getElementById('note-category')
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        state.noteCategory = e.target.value
      })
    }

    const contentTextarea = document.getElementById('note-content')
    if (contentTextarea) {
      contentTextarea.addEventListener('change', (e) => {
        state.noteContent = e.target.value
      })
    }

    const saveNoteBtn = document.getElementById('save-note-btn')
    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', saveNote)
    }

    const clearEditorBtn = document.getElementById('clear-editor-btn')
    if (clearEditorBtn) {
      clearEditorBtn.addEventListener('click', clearEditor)
    }

    const editNoteBtns = document.querySelectorAll('.edit-note-btn')
    editNoteBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const noteId = btn.dataset.noteId
        const note = state.notes.find((n) => n.id === parseInt(noteId))
        if (note) {
          editNote(note)
        }
      })
    })

    const deleteNoteBtns = document.querySelectorAll('.delete-note-btn')
    deleteNoteBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const noteId = btn.dataset.noteId
        if (confirm('Are you sure you want to delete this note?')) {
          deleteNote(parseInt(noteId))
        }
      })
    })
  }
}

// Start the app
initialize()
