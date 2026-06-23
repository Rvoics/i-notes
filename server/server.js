import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PORT = process.env.PORT || 4000
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'notekepper-secret'
const DATA_PATH = join(__dirname, 'data.json')

const app = express()
app.use(cors())
app.use(express.json())

const loadData = async () => {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { users: {} }
  }
}

const saveData = async (data) => {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token.' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, TOKEN_SECRET)
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' })
  }

  const data = await loadData()
  const normalizedEmail = email.toLowerCase().trim()
  if (data.users[normalizedEmail]) {
    return res.status(409).json({ message: 'Email already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  data.users[normalizedEmail] = {
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    notes: [],
  }

  await saveData(data)
  const token = jwt.sign({ email: normalizedEmail }, TOKEN_SECRET, { expiresIn: '2h' })

  res.json({ token, user: { name: data.users[normalizedEmail].name, email: normalizedEmail }, notes: [] })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  const data = await loadData()
  const normalizedEmail = email.toLowerCase().trim()
  const user = data.users[normalizedEmail]
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const token = jwt.sign({ email: normalizedEmail }, TOKEN_SECRET, { expiresIn: '2h' })
  res.json({ token, user: { name: user.name, email: user.email }, notes: user.notes || [] })
})

app.get('/api/me', authenticate, async (req, res) => {
  const data = await loadData()
  const user = data.users[req.user.email]
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }
  res.json({ user: { name: user.name, email: user.email }, notes: user.notes || [] })
})

app.post('/api/notes', authenticate, async (req, res) => {
  const { title, content, category } = req.body
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required.' })
  }

  const data = await loadData()
  const user = data.users[req.user.email]
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const note = {
    id: `note-${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    category: category?.trim() || 'Personal',
    updatedAt: new Date().toISOString(),
  }

  user.notes = [note, ...(user.notes || [])]
  await saveData(data)
  res.json({ notes: user.notes })
})

app.put('/api/notes/:id', authenticate, async (req, res) => {
  const { title, content, category } = req.body
  const noteId = req.params.id
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required.' })
  }

  const data = await loadData()
  const user = data.users[req.user.email]
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  user.notes = (user.notes || []).map((note) => {
    if (note.id !== noteId) return note
    return {
      ...note,
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || 'Personal',
      updatedAt: new Date().toISOString(),
    }
  })

  await saveData(data)
  res.json({ notes: user.notes })
})

app.delete('/api/notes/:id', authenticate, async (req, res) => {
  const noteId = req.params.id
  const data = await loadData()
  const user = data.users[req.user.email]
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  user.notes = (user.notes || []).filter((note) => note.id !== noteId)
  await saveData(data)
  res.json({ notes: user.notes })
})

app.listen(PORT, () => {
  console.log(`NoteKepper API listening on http://localhost:${PORT}`)
})
