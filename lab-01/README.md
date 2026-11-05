# Lab 1: Node.js and Express Server

**Course:** Backend Development Fundamentals · Year II Term II · Aurora  
**Faculty:**  Chintakrindi Sai Siva Teja

---

**Name:** Anudeep panakanti  
**Registration Number:** 214  
**Section:** 214 CSE-2D

---

## Live Link

**Deployed link:** https://bdf-lab-1-anudeep-214.vercel.app/

---

## How to Run

### Prerequisites
- Node.js v18 or later installed
- npm (bundled with Node.js)

### Install & Start

```bash
# 1. Clone the repository
git clone https://github.com/panakantianudeep789/BDF-LAB1-Anudeep-214.git
cd BDF-LAB1-Anudeep-214/lab-01

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

The server starts on **http://localhost:3000** by default.

### Environment Variables

| Variable | Description               | Example |
|----------|---------------------------|---------|
| `PORT`   | Port the server listens on | `3000`  |

> No `.env` file is required for this lab; `PORT` falls back to `3000` if not set.  
> **Never commit `.env` files or `node_modules/`.**

---

## Endpoints

| Method | Path          | Description                                    | Status Code |
|--------|---------------|------------------------------------------------|-------------|
| GET    | `/`           | Returns a plain-text welcome message           | 200         |
| GET    | `/about`      | Returns JSON with student name and section     | 200         |
| GET    | `/time`       | Returns current server date & time as JSON     | 200         |
| `*`    | any other path | Returns a 404 JSON error message              | 404         |

---

## Screenshots

### GET `/` — Welcome message (200)
![GET / response](screenshots/route-root.png)

### GET `/about` — Student info JSON (200)
![GET /about response](screenshots/route-about.png)

### GET `/time` — Current date/time (200)
![GET /time response](screenshots/route-time.png)

### GET `/unknown` — 404 handler (404)
![404 response](screenshots/route-404.png)

---

## Project Structure

```
lab-01/
├── index.js          # Main Express server (Tasks 4–6)
├── http-server.js    # Plain http.createServer demo (Task 3)
├── package.json      # Project metadata & scripts
├── .gitignore        # Excludes node_modules and .env
├── screenshots/      # Browser screenshots of all routes
│   ├── route-root.png
│   ├── route-about.png
│   ├── route-time.png
│   └── route-404.png
└── README.md
```

---

## package.json Fields Explained

| Field         | Meaning                                                    |
|---------------|------------------------------------------------------------|
| `name`        | Package name (must be lowercase, no spaces)                |
| `version`     | Semantic version of the project (`major.minor.patch`)      |
| `description` | Short human-readable description                           |
| `main`        | Entry-point file Node.js loads (`index.js`)                |
| `scripts`     | npm shortcuts – `npm start` runs `node index.js`           |
| `keywords`    | Search tags if published to npm                            |
| `author`      | Package author name                                        |
| `license`     | Distribution licence (ISC = permissive open-source)        |
| `dependencies`| Packages required at runtime (Express is listed here)      |

---

## Viva Answers

**Q: What is the difference between `package.json` and `node_modules`?**  
`package.json` is a manifest file that lists the project's metadata and dependencies by name and version. `node_modules/` is the folder where npm physically downloads and stores the actual code of those dependencies. You commit `package.json` but never commit `node_modules/`.

**Q: What does `app.listen` do?**  
It binds the Express application to a TCP port on the server, starts listening for incoming HTTP requests, and optionally runs a callback when the server is ready.

**Q: What do `request` and `response` represent?**  
`request` (`req`) contains all information about the incoming HTTP request — URL, headers, query parameters, body, etc. `response` (`res`) represents the HTTP response the server sends back; you call methods like `res.send()`, `res.json()`, and `res.status()` on it to build and send the reply.

---

## Notes

- **Problem faced:** Understanding the difference between the built-in `http` module and Express — the `http` module requires manual routing logic while Express provides a clean, declarative routing API.
- **How solved:** Built `http-server.js` first (Task 3), then rewrote it as `index.js` using Express to see the contrast directly.
