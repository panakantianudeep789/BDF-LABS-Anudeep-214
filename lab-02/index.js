// ──────────────────────────────────────────────────────────────────
// Lab 2 – SQLite database and CRUD routes (Pure JS / WebAssembly SQLite)
// Compatible with all Cloud Deployments (Render, Vercel, Railway)
// Backend Development Fundamentals · Year II Term II · Aurora
// Faculty: Chintakrindi Sai Siva Teja / Joel Prashanth D
// Name   : Anudeep panakanti
// Reg No : 214
// Section: 214 CSE-2D
// ──────────────────────────────────────────────────────────────────

const express = require("express");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json()); // parse JSON request bodies

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "books.db");

let db;

// Helper to persist database changes to disk
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error("Error saving database file:", err.message);
  }
}

// ── initializeDBAndServer ──────────────────────────────────────────
const initializeDBAndServer = async () => {
  try {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const filebuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(filebuffer);
    } else {
      db = new SQL.Database();
    }

    // Create the book table
    db.run(`
      CREATE TABLE IF NOT EXISTS book (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        title   TEXT    NOT NULL,
        author  TEXT    NOT NULL,
        price   INTEGER NOT NULL,
        pages   INTEGER NOT NULL
      );
    `);

    // Check count and seed if empty
    const res = db.exec("SELECT COUNT(*) AS cnt FROM book;");
    const count = res.length > 0 && res[0].values[0] ? res[0].values[0][0] : 0;

    if (count === 0) {
      db.run(`
        INSERT INTO book (title, author, price, pages) VALUES
          ('The Pragmatic Programmer',      'Andrew Hunt',       499, 352),
          ('Clean Code',                    'Robert C. Martin',  399, 464),
          ('You Don''t Know JS',            'Kyle Simpson',      299, 278),
          ('JavaScript: The Good Parts',   'Douglas Crockford', 349, 176),
          ('Eloquent JavaScript',           'Marijn Haverbeke',  249, 472),
          ('Node.js Design Patterns',       'Mario Casciaro',    599, 660),
          ('Learning SQL',                  'Alan Beaulieu',     449, 338),
          ('Database System Concepts',      'Silberschatz',      799, 1376),
          ('Pro Git',                       'Scott Chacon',      299, 574),
          ('The Web Application Hacker''s Handbook', 'Stuttard', 649, 912);
      `);
      saveDatabase();
      console.log("Database seeded with 10 books.");
    }

    app.listen(PORT, () => {
      console.log(`\n  Express + SQLite server running!`);
      console.log(`   Local : http://localhost:${PORT}`);
      console.log(`   DB    : ${DB_PATH}\n`);
    });
  } catch (error) {
    console.error("DB initialization failed:", error.message);
    process.exit(1);
  }
};

// ══════════════════════════════════════════════════════════════════
// CRUD ROUTES
// ══════════════════════════════════════════════════════════════════

// ── GET /books/ ───────────────────────────────────────────────────
app.get("/books/", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM book ORDER BY id;");
    const books = [];
    while (stmt.step()) {
      books.push(stmt.getAsObject());
    }
    stmt.free();
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /books/:bookId/ ───────────────────────────────────────────
app.get("/books/:bookId/", (req, res) => {
  try {
    const { bookId } = req.params;
    const stmt = db.prepare("SELECT * FROM book WHERE id = ?;");
    stmt.bind([bookId]);
    if (stmt.step()) {
      const book = stmt.getAsObject();
      stmt.free();
      return res.status(200).json(book);
    }
    stmt.free();
    res.status(404).json({ error: "Book not found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /books/ ──────────────────────────────────────────────────
app.post("/books/", (req, res) => {
  try {
    const { title, author, price, pages } = req.body;
    if (!title || !author || price == null || pages == null) {
      return res
        .status(400)
        .json({ error: "title, author, price and pages are required" });
    }

    db.run("INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);", [
      title,
      author,
      price,
      pages,
    ]);

    // Retrieve last inserted id
    const resId = db.exec("SELECT last_insert_rowid() AS id;");
    const lastID = resId[0].values[0][0];

    saveDatabase();
    res.status(201).json({ id: lastID, message: "Book added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /books/:bookId/ ───────────────────────────────────────────
app.put("/books/:bookId/", (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book exists
    const checkStmt = db.prepare("SELECT * FROM book WHERE id = ?;");
    checkStmt.bind([bookId]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: "Book not found" });
    }
    const existing = checkStmt.getAsObject();
    checkStmt.free();

    const title  = req.body.title  ?? existing.title;
    const author = req.body.author ?? existing.author;
    const price  = req.body.price  ?? existing.price;
    const pages  = req.body.pages  ?? existing.pages;

    db.run(
      "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;",
      [title, author, price, pages, bookId]
    );

    saveDatabase();
    res.status(200).json({ message: "Book updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /books/:bookId/ ────────────────────────────────────────
app.delete("/books/:bookId/", (req, res) => {
  try {
    const { bookId } = req.params;

    const checkStmt = db.prepare("SELECT * FROM book WHERE id = ?;");
    checkStmt.bind([bookId]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: "Book not found" });
    }
    checkStmt.free();

    db.run("DELETE FROM book WHERE id = ?;", [bookId]);
    saveDatabase();
    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "404 - Route not found",
    path: req.originalUrl,
  });
});

initializeDBAndServer();
