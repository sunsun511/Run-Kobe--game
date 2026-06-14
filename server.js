const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const HOST = '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

function resolveRequestPath(urlPath) {
  let pathname = decodeURIComponent(urlPath);

  if (pathname === '/' || pathname === '/index.html' || pathname === '/Kobe') {
    return path.join(ROOT, 'index.html');
  }

  if (pathname === '/Kobe/') {
    return path.join(ROOT, 'index.html');
  }

  if (pathname.startsWith('/Kobe/')) {
    pathname = pathname.slice('/Kobe'.length);
  }

  return path.join(ROOT, pathname);
}

function sendFile(res, filePath) {
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(normalized, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const type = MIME_TYPES[path.extname(normalized)] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  sendFile(res, resolveRequestPath(url.pathname));
});

server.listen(PORT, HOST, () => {
  console.log(`Kobe runner ready at http://${HOST}:${PORT}/Kobe`);
});
