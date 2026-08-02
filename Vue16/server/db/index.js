const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const defaultPath = path.join(dataDir, 'tomato_disease.db')

let db = null
let currentPath = defaultPath

function getDb() {
  if (!db) {
    if (!fs.existsSync(currentPath)) {
      require('./init')
    }
    db = new Database(currentPath)
    db.pragma('journal_mode = WAL')
  }
  return db
}

function reconnect(filePath) {
  if (db) {
    db.close()
    db = null
  }
  currentPath = filePath || defaultPath
  db = new Database(currentPath)
  db.pragma('journal_mode = WAL')
  return db
}

function getCurrentPath() {
  return currentPath
}

module.exports = { getDb, reconnect, getCurrentPath, defaultPath }
