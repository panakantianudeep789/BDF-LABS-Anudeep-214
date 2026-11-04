// ──────────────────────────────────────────────────────────────────
// Lab 3 – REST API, query parameters, validation, debugging
// Backend Development Fundamentals · Year II Term II · Aurora
// Faculty: Joel Prashanth D / Chintakrindi Sai Siva Teja
// Name   : Anudeep panakanti
// Reg No : 214
// Section: 214 CSE-2D
// ──────────────────────────────────────────────────────────────────

const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "books.db");

let db;

// ── initializeDBAndServer ──────────────────────────────────────────
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });

    // Create table if not present
    await db.exec(`
      CREATE TABLE IF NOT EXISTS book (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        title   TEXT    NOT NULL,
        author  TEXT    NOT NULL,
        price   INTEGER NOT NULL,
        pages   INTEGER NOT NULL
      );
    `);

    // Seed initial rows if empty
    const count = await db.get("SELECT COUNT(*) AS cnt FROM book");
    if (count.cnt === 0) {
      await db.exec(`
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
      console.log("Database seeded with 10 books.");
    }

    app.listen(PORT, () => {
      console.log(`\n  REST API Server running on http://localhost:${PORT}`);
      console.log(`  Database path: ${DB_PATH}\n`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

// ══════════════════════════════════════════════════════════════════
// REST API ROUTES
// ══════════════════════════════════════════════════════════════════

// ── 1. GET /books (Search, Filter, Sort, Pagination) ──────────────
// Supports query parameters:
// - search_q: partial title match (LIKE %search_q%)
// - min_price, max_price: price range filter (BETWEEN or conditions)
// - order_by: id | title | price | pages (default: id)
// - order: ASC | DESC (default: ASC)
// - limit: number of records (default: 10)
// - offset: number of records to skip (default: 0)
app.get("/books", async (req, res) => {
  try {
    const {
      search_q = "",
      order_by = "id",
      order = "ASC",
      limit = 10,
      offset = 0,
      min_price,
      max_price,
    } = req.query;

    // Allowed columns and directions to prevent SQL injection in ORDER BY clause
    const allowedOrderBy = ["id", "title", "price", "pages", "author"];
    const sortColumn = allowedOrderBy.includes(order_by.toLowerCase())
      ? order_by.toLowerCase()
      : "id";
    const sortDirection = order.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    if (isNaN(parsedLimit) || parsedLimit < 0) {
      return res.status(400).json({ message: "Query parameter 'limit' must be a non-negative integer." });
    }
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({ message: "Query parameter 'offset' must be a non-negative integer." });
    }

    // Build conditions with parameterized queries
    const conditions = [];
    const params = [];

    // Search query (case-insensitive partial match on title)
    if (search_q) {
      conditions.push("title LIKE ?");
      params.push(`%${search_q}%`);
    }

    // Price range filters
    if (min_price !== undefined && max_price !== undefined) {
      const minP = Number(min_price);
      const maxP = Number(max_price);
      if (isNaN(minP) || isNaN(maxP)) {
        return res.status(400).json({ message: "min_price and max_price must be numeric." });
      }
      conditions.push("price BETWEEN ? AND ?");
      params.push(minP, maxP);
    } else if (min_price !== undefined) {
      const minP = Number(min_price);
      if (isNaN(minP)) {
        return res.status(400).json({ message: "min_price must be numeric." });
      }
      conditions.push("price >= ?");
      params.push(minP);
    } else if (max_price !== undefined) {
      const maxP = Number(max_price);
      if (isNaN(maxP)) {
        return res.status(400).json({ message: "max_price must be numeric." });
      }
      conditions.push("price <= ?");
      params.push(maxP);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sqlQuery = `
      SELECT * FROM book
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?;
    `;
    params.push(parsedLimit, parsedOffset);

    const books = await db.all(sqlQuery, params);
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 2. GET /books/:bookId (Fetch single book) ──────────────────────
app.get("/books/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const book = await db.get("SELECT * FROM book WHERE id = ?", [bookId]);

    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 3. POST /books (Add new book with body validation) ─────────────
// Validates:
// - title must be present and non-empty string
// - author must be present and non-empty string
// - price must be a valid positive number
// - pages must be a valid positive number
app.post("/books", async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;

    // Validation rules
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ message: "Field 'title' is required and must be a non-empty string." });
    }

    if (!author || typeof author !== "string" || author.trim() === "") {
      return res.status(400).json({ message: "Field 'author' is required and must be a non-empty string." });
    }

    if (price === undefined || price === null || typeof price !== "number" || isNaN(price) || price < 0) {
      return res.status(400).json({ message: "Field 'price' is required and must be a positive number." });
    }

    if (pages === undefined || pages === null || typeof pages !== "number" || isNaN(pages) || pages <= 0) {
      return res.status(400).json({ message: "Field 'pages' is required and must be a positive integer." });
    }

    const result = await db.run(
      "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)",
      [title.trim(), author.trim(), price, pages]
    );

    res.status(201).json({
      id: result.lastID,
      message: "Book created successfully.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 4. PUT /books/:bookId (Update book) ────────────────────────────
app.put("/books/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const existingBook = await db.get("SELECT * FROM book WHERE id = ?", [bookId]);

    if (!existingBook) {
      return res.status(404).json({ message: "Book not found." });
    }

    const { title, author, price, pages } = req.body;

    if (price !== undefined && (typeof price !== "number" || isNaN(price) || price < 0)) {
      return res.status(400).json({ message: "Field 'price' must be a valid non-negative number." });
    }
    if (pages !== undefined && (typeof pages !== "number" || isNaN(pages) || pages <= 0)) {
      return res.status(400).json({ message: "Field 'pages' must be a valid positive integer." });
    }

    const updatedTitle  = title !== undefined ? String(title).trim() : existingBook.title;
    const updatedAuthor = author !== undefined ? String(author).trim() : existingBook.author;
    const updatedPrice  = price !== undefined ? price : existingBook.price;
    const updatedPages  = pages !== undefined ? pages : existingBook.pages;

    await db.run(
      "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?",
      [updatedTitle, updatedAuthor, updatedPrice, updatedPages, bookId]
    );

    res.status(200).json({ message: "Book updated successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 5. DELETE /books/:bookId (Remove book) ─────────────────────────
app.delete("/books/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const existingBook = await db.get("SELECT * FROM book WHERE id = ?", [bookId]);

    if (!existingBook) {
      return res.status(404).json({ message: "Book not found." });
    }

    await db.run("DELETE FROM book WHERE id = ?", [bookId]);
    res.status(200).json({ message: "Book deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Catch-all 404 Route ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found." });
});

initializeDBAndServer();
