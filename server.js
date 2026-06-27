/* ============================================
   Voya Travel - Backend Server
   Serves static files + REST API for
   products, promotions, journal, destinations.
   No external dependencies — pure Node.js.
   ============================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "data.json");
const IMG_DIR = path.join(ROOT, "images");

// In-memory session store (resets on server restart)
const sessions = {};

/* ---- Password ---- */
// Password priority: data.json (brand.adminPassword) > env var > default
function getAdminPassword() {
  try {
    const data = readData();
    if (data && data.brand && data.brand.adminPassword) {
      return data.brand.adminPassword;
    }
  } catch (e) {}
  return process.env.ADMIN_PASSWORD || "voya2024";
}

function setAdminPassword(newPwd) {
  const data = readData();
  if (!data.brand) data.brand = {};
  data.brand.adminPassword = newPwd;
  writeData(data);
}

function verifyPassword(inputPwd) {
  return inputPwd === getAdminPassword();
}

function generateSession() {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessions[token] = { expires: Date.now() + 24 * 60 * 60 * 1000 }; // 24h
  return token;
}

function verifySession(token) {
  if (!token || !sessions[token]) return false;
  if (sessions[token].expires < Date.now()) { delete sessions[token]; return false; }
  // Refresh expiry on valid use
  sessions[token].expires = Date.now() + 24 * 60 * 60 * 1000;
  return true;
}

/* ---- MIME types ---- */
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/* ---- Data helpers ---- */
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading data.json:", e.message);
    return { products: [], promotions: [], journal: [], destinations: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function genId(str) {
  return (
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Date.now().toString(36).slice(-4)
  );
}

/* ---- Read request body ---- */
function readBody(req) {
  return new Promise(function (resolve, reject) {
    let chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

/* ---- Send JSON response ---- */
function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

/* ---- Serve static file ---- */
function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";

  // Security: prevent path traversal
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found: " + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

/* ---- API Router ---- */
async function handleAPI(req, res, method, segments) {
  const resource = segments[1];
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const token = urlObj.searchParams.get("token");

  /* ===== 1. PUBLIC endpoints (no auth required) ===== */

  // POST /api/login — authenticate
  if (resource === "login" && method === "POST") {
    const body = await readBody(req);
    if (verifyPassword(body.password)) {
      const t = generateSession();
      sendJSON(res, 200, { success: true, token: t });
    } else {
      sendJSON(res, 401, { success: false, error: "密码错误 / Invalid password" });
    }
    return;
  }

  // GET /api/verify — verify session token
  if (resource === "verify" && method === "GET") {
    sendJSON(res, 200, { valid: verifySession(token) });
    return;
  }

  // GET /api/data — return everything (public read)
  if (resource === "data" && method === "GET") {
    sendJSON(res, 200, readData());
    return;
  }

  // GET /api/settings — return brand settings (public read)
  if (resource === "settings" && method === "GET") {
    sendJSON(res, 200, readData().brand || {});
    return;
  }

  // GET /api/hero — return hero banner data (public read)
  if (resource === "hero" && method === "GET") {
    sendJSON(res, 200, readData().hero || {});
    return;
  }

  // GET /api/footer — return footer data (public read)
  if (resource === "footer" && method === "GET") {
    sendJSON(res, 200, readData().footer || {});
    return;
  }

  // GET /api/about — return about page data (public read)
  if (resource === "about" && method === "GET") {
    sendJSON(res, 200, readData().about || {});
    return;
  }

  // Collection GET (public read): /api/products, /api/promotions, etc.
  if (["products","promotions","journal","destinations"].indexOf(resource) !== -1 && method === "GET" && !segments[2]) {
    sendJSON(res, 200, (readData()[resource] || []));
    return;
  }

  /* ===== 2. AUTH CHECK (required for all write operations) ===== */
  if (!verifySession(token)) {
    sendJSON(res, 401, { error: "Please login first" });
    return;
  }

  /* ===== 3. WRITE endpoints (auth required) ===== */

  // POST /api/change-password
  if (resource === "change-password" && method === "POST") {
    const body = await readBody(req);
    if (!verifyPassword(body.currentPassword)) {
      sendJSON(res, 401, { success: false, error: "Current password is incorrect" });
      return;
    }
    if (!body.newPassword || body.newPassword.length < 4) {
      sendJSON(res, 400, { success: false, error: "New password must be at least 4 characters" });
      return;
    }
    try {
      setAdminPassword(body.newPassword);
      sendJSON(res, 200, { success: true, message: "Password changed successfully" });
    } catch (e) {
      sendJSON(res, 500, { success: false, error: "Failed to save password" });
    }
    return;
  }

  // POST /api/import — import full data.json (backup restore)
  if (resource === "import" && method === "POST") {
    try {
      const body = await readBody(req);
      if (!body || typeof body !== "object") {
        sendJSON(res, 400, { success: false, error: "Invalid data format" });
        return;
      }
      writeData(body);
      sendJSON(res, 200, { success: true, message: "Data imported successfully" });
    } catch (e) {
      sendJSON(res, 500, { success: false, error: "Import failed: " + e.message });
    }
    return;
  }

  // PUT /api/settings
  if (resource === "settings" && method === "PUT") {
    const body = await readBody(req);
    const data = readData();
    data.brand = Object.assign({}, data.brand || {}, body);
    writeData(data);
    sendJSON(res, 200, data.brand);
    return;
  }

  // PUT /api/hero
  if (resource === "hero" && method === "PUT") {
    const body = await readBody(req);
    const data = readData();
    data.hero = Object.assign({}, data.hero || {}, body);
    writeData(data);
    sendJSON(res, 200, data.hero);
    return;
  }

  // PUT /api/footer
  if (resource === "footer" && method === "PUT") {
    const body = await readBody(req);
    const data = readData();
    data.footer = body;
    writeData(data);
    sendJSON(res, 200, data.footer);
    return;
  }

  // PUT /api/about
  if (resource === "about" && method === "PUT") {
    const body = await readBody(req);
    const data = readData();
    data.about = body;
    writeData(data);
    sendJSON(res, 200, data.about);
    return;
  }

  // PUT /api/data — full data replacement
  if (resource === "data" && method === "PUT") {
    const body = await readBody(req);
    writeData(body);
    sendJSON(res, 200, { ok: true });
    return;
  }

  // POST /api/upload — save base64 image
  if (resource === "upload" && method === "POST") {
    const body = await readBody(req);
    if (!body.data || !body.name) {
      sendJSON(res, 400, { error: "Missing name or data" });
      return;
    }
    const match = body.data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      sendJSON(res, 400, { error: "Invalid image data" });
      return;
    }
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const fileName = "upload-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    const imgPath = path.join(IMG_DIR, fileName);
    const buffer = Buffer.from(match[2], "base64");
    fs.writeFileSync(imgPath, buffer);
    sendJSON(res, 200, { path: "images/" + fileName });
    return;
  }

  // Collection write operations: products, promotions, journal, destinations
  if (["products","promotions","journal","destinations"].indexOf(resource) !== -1) {
    const data = readData();
    let collection = data[resource] || [];

    // POST — add new item
    if (method === "POST" && !segments[2]) {
      const body = await readBody(req);
      if (!body.id) body.id = genId(body.title || body.name || "item");
      collection.push(body);
      data[resource] = collection;
      writeData(data);
      sendJSON(res, 201, body);
      return;
    }

    // Item-level: PUT (update) or DELETE
    const itemId = segments[2];
    if (itemId) {
      const index = collection.findIndex(function (item) { return item.id === itemId; });

      if (method === "PUT") {
        if (index === -1) { sendJSON(res, 404, { error: "Not found" }); return; }
        const body = await readBody(req);
        body.id = itemId;
        collection[index] = Object.assign({}, collection[index], body);
        data[resource] = collection;
        writeData(data);
        sendJSON(res, 200, collection[index]);
        return;
      }

      if (method === "DELETE") {
        if (index === -1) { sendJSON(res, 404, { error: "Not found" }); return; }
        collection.splice(index, 1);
        data[resource] = collection;
        writeData(data);
        sendJSON(res, 200, { ok: true });
        return;
      }
    }
  }

  sendJSON(res, 404, { error: "Unknown API endpoint" });
}

/* ---- Create server ---- */
const server = http.createServer(async function (req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const urlPath = req.url.split("?")[0];
  const segments = urlPath.split("/").filter(Boolean);

  // API routes: /api/...
  if (segments[0] === "api") {
    try {
      await handleAPI(req, res, req.method, segments);
    } catch (e) {
      console.error("API error:", e);
      sendJSON(res, 500, { error: e.message });
    }
    return;
  }

  // Everything else: static files
  serveStatic(req, res);
});

server.listen(PORT, function () {
  console.log("=============================================");
  console.log("  Voya Travel Server");
  console.log("  Website:  http://localhost:" + PORT);
  console.log("  Admin:    http://localhost:" + PORT + "/admin.html");
  console.log("  API:      http://localhost:" + PORT + "/api/data");
  console.log("=============================================");
});
