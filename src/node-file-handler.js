/**
 * Node.js file path handler - only used in Node.js environment
 * This module is excluded from browser builds via webpack externals
 */

const fs = require("fs");
const path = require("path");

export function handleFilePath(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();

  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
  };

  const mimeType = mimeTypes[ext] || "application/octet-stream";
  const fileName = path.basename(filePath);

  // Return an object that mimics File/Blob structure for validation
  return {
    data: buffer,
    name: fileName,
    type: mimeType,
    size: buffer.length,
  };
}
