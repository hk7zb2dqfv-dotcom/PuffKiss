const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const requestedPort = Number(globalThis.PUFFKISS_PORT || globalThis.process?.argv?.[2] || globalThis.process?.env?.PORT);
const port = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 4173;
const host = "127.0.0.1";
const root = __dirname;
const dataDir = path.join(root, "data");
const databasePath = path.join(dataDir, "puffkiss-db.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function defaultDatabase() {
  const now = Date.now();

  return {
    story: {
      liked: false,
      followed: false,
      rating: 4.9,
      likeLabel: "9.4K"
    },
    comments: [
      {
        id: 1,
        user: "ShadowReader",
        badge: "Top Fan",
        avatar: "assets/avatar-shadow.png",
        text: "This chapter was amazing! The art, the story, everything is peak!",
        createdAt: now - 2 * 60 * 60 * 1000,
        likes: 45
      },
      {
        id: 2,
        user: "StarLight",
        badge: "Supporter",
        avatar: "assets/supporter-starlight.png",
        text: "The eclipse panel gave me chills. I need chapter 13 immediately.",
        createdAt: now - 5 * 60 * 60 * 1000,
        likes: 72
      }
    ],
    supporters: [
      { name: "StarLight", amount: 200, avatar: "assets/supporter-starlight.png" },
      { name: "MangaLover", amount: 150, avatar: "assets/supporter-manga.png" },
      { name: "DreamWalker", amount: 100, avatar: "assets/supporter-dream.png" },
      { name: "Astra", amount: 80, avatar: "assets/avatar-comment.png" },
      { name: "Nocturne", amount: 55, avatar: "assets/avatar-shadow.png" }
    ],
    uploads: [],
    creator: {
      name: "Lunaria",
      primaryGenre: "Fantasy",
      supportEnabled: true
    },
    donations: []
  };
}

async function readDatabase() {
  try {
    const raw = await fs.readFile(databasePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const database = defaultDatabase();
    await writeDatabase(database);
    return database;
  }
}

async function writeDatabase(database) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(databasePath, JSON.stringify(database, null, 2));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function sanitizeText(value, maxLength = 160) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

async function readRequestBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body is too large.");
  }

  return body ? JSON.parse(body) : {};
}

async function handleApi(request, response, url) {
  const database = await readDatabase();

  if (request.method === "GET" && url.pathname === "/api/state") {
    sendJson(response, 200, database);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/comments") {
    const body = await readRequestBody(request);
    const text = sanitizeText(body.text);

    if (!text) {
      sendJson(response, 400, { error: "Comment text is required." });
      return;
    }

    const comment = {
      id: Date.now(),
      user: "Lunaria",
      badge: "Creator",
      avatar: "assets/avatar-comment.png",
      text,
      createdAt: Date.now(),
      likes: 0
    };

    database.comments.push(comment);
    await writeDatabase(database);
    sendJson(response, 201, { comment, comments: database.comments });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/comment-like") {
    const body = await readRequestBody(request);
    const comment = database.comments.find((item) => item.id === Number(body.id));

    if (!comment) {
      sendJson(response, 404, { error: "Comment not found." });
      return;
    }

    comment.likes += 1;
    await writeDatabase(database);
    sendJson(response, 200, { comment, comments: database.comments });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/donations") {
    const body = await readRequestBody(request);
    const amount = Math.max(1, Math.min(5000, Math.round(Number(body.amount) || 0)));

    if (!amount) {
      sendJson(response, 400, { error: "Donation amount is required." });
      return;
    }

    const donation = {
      id: Date.now(),
      name: "Lunaria",
      amount,
      createdAt: Date.now()
    };
    const existing = database.supporters.find((supporter) => supporter.name === "Lunaria");

    if (existing) existing.amount += amount;
    else database.supporters.push({ name: "Lunaria", amount, avatar: "assets/avatar-lunaria.png" });

    database.donations.push(donation);
    await writeDatabase(database);
    sendJson(response, 201, { donation, supporters: database.supporters });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/uploads") {
    const body = await readRequestBody(request);
    const title = sanitizeText(body.title, 80);
    const genre = sanitizeText(body.genre, 30) || "Fantasy";
    const chapter = sanitizeText(body.chapter, 80);

    if (!title || !chapter) {
      sendJson(response, 400, { error: "Title and chapter are required." });
      return;
    }

    const upload = {
      id: Date.now(),
      title,
      genre,
      chapter,
      createdAt: Date.now()
    };

    database.uploads.push(upload);
    await writeDatabase(database);
    sendJson(response, 201, { upload, uploads: database.uploads });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/creator") {
    const body = await readRequestBody(request);
    database.creator = {
      name: sanitizeText(body.creator, 50) || "Lunaria",
      primaryGenre: sanitizeText(body.primaryGenre, 30) || "Fantasy",
      supportEnabled: Boolean(body.supportEnabled)
    };
    await writeDatabase(database);
    sendJson(response, 200, { creator: database.creator });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/follow") {
    const body = await readRequestBody(request);
    database.story.followed = Boolean(body.followed);
    await writeDatabase(database);
    sendJson(response, 200, { followed: database.story.followed });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/like") {
    const body = await readRequestBody(request);
    database.story.liked = Boolean(body.liked);
    database.story.likeLabel = database.story.liked ? "9.5K" : "9.4K";
    await writeDatabase(database);
    sendJson(response, 200, {
      liked: database.story.liked,
      likeLabel: database.story.likeLabel
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/rating") {
    const body = await readRequestBody(request);
    database.story.rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
    await writeDatabase(database);
    sendJson(response, 200, { rating: database.story.rating });
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
}

async function serveStatic(response, url) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(root, decodeURIComponent(pathname)));
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(response, url);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
});

server.listen(port, host, () => {
  console.log(`PuffKiss website and API running at http://${host}:${port}/`);
});

module.exports = server;
