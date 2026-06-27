/* ============================================
   Voya Travel - Backend Server
   Serves static files + REST API for
   products, promotions, and journal.
   No external dependencies — pure Node.js.
   ============================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "data.json");
const IMG_DIR = path.join(ROOT, "images");

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
    return { products: [], promotions: [], journal: [] };
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
    req.on("data", function (c) {
      chunks.push(c);
    });
    req.on("end", function () {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
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
  // segments example: ["api", "products"] or ["api", "products", "greek-island-hopping"]
  const resource = segments[1]; // products | promotions | journal | upload | data

  // GET /api/data — return everything
  if (resource === "data" && method === "GET") {
    const data = readData();
    sendJSON(res, 200, data);
    return;
  }

  // GET /api/data — also allow POST for full update (used by admin "save all")
  if (resource === "data" && method === "PUT") {
    const body = await readBody(req);
    writeData(body);
    sendJSON(res, 200, { ok: true });
    return;
  }

  // POST /api/upload — save base64 image, return path
  if (resource === "upload" && method === "POST") {
    const body = await readBody(req);
    // body: { name: "photo.jpg", data: "data:image/png;base64,...." }
    if (!body.data || !body.name) {
      sendJSON(res, 400, { error: "Missing name or data" });
      return;
    }
    // Extract base64 part
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

  // Collection-level operations: products, promotions, journal
  if (["products", "promotions", "journal"].indexOf(resource) !== -1) {
    const data = readData();
    const collection = data[resource] || [];

    // GET /api/{resource} — list all
    if (method === "GET" && !segments[2]) {
      sendJSON(res, 200, collection);
      return;
    }

    // POST /api/{resource} — add new item
    if (method === "POST" && !segments[2]) {
      const body = await readBody(req);
      if (!body.id) body.id = genId(body.title || body.name || "item");
      collection.push(body);
      data[resource] = collection;
      writeData(data);
      sendJSON(res, 201, body);
      return;
    }

    // Item-level operations: /api/{resource}/{id}
    const itemId = segments[2];
    if (itemId) {
      const index = collection.findIndex(function (item) {
        return item.id === itemId;
      });

      // PUT /api/{resource}/{id} — update item
      if (method === "PUT") {
        const body = await readBody(req);
        if (index === -1) {
          sendJSON(res, 404, { error: "Not found" });
          return;
        }
        body.id = itemId; // preserve ID
        collection[index] = Object.assign({}, collection[index], body);
        data[resource] = collection;
        writeData(data);
        sendJSON(res, 200, collection[index]);
        return;
      }

      // DELETE /api/{resource}/{id} — delete item
      if (method === "DELETE") {
        if (index === -1) {
          sendJSON(res, 404, { error: "Not found" });
          return;
        }
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
