/**
 * Integration tests for admin upload routes.
 *
 * Uses a mock Express app with mock session and multer for file handling.
 * No database required.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import { createMockAdminApp } from "../../test-utils.js";

// We mount the real upload router to test multer integration.
// Need to create the uploads directory first.
import uploadRoutes from "../../../routes/admin/uploads.js";

const uploadsDir = path.resolve(process.cwd(), "uploads");
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-test-"));

before(() => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
});

after(() => {
  // Clean up fixture files
  try {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ---------------------------------------------------------------------------
// 1. Upload validation (mock app)
// ---------------------------------------------------------------------------

describe("Admin uploads — validation", () => {
  const app = createMockAdminApp(["/api/admin/uploads", uploadRoutes]);

  it("POST /api/admin/uploads without file returns 200 with empty urls", async () => {
    // When no file is sent, multer passes through and the handler
    // returns an empty urls array.
    const res = await supertest(app).post("/api/admin/uploads");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.deepEqual(res.body.data.urls, []);
  });

  it("POST /api/admin/uploads with valid image returns 200 with one url", async () => {
    // Create a small valid JPEG fixture
    // Minimal valid JPEG (1x1 pixel)
    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AACgA/9k=",
      "base64",
    );

    const res = await supertest(app)
      .post("/api/admin/uploads")
      .attach("images", jpegBuffer, "test.jpg");

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(Array.isArray(res.body.data.urls));
    assert.equal(res.body.data.urls.length, 1);
    assert.ok(res.body.data.urls[0].startsWith("/uploads/"));
    assert.ok(res.body.data.urls[0].endsWith(".jpg"));
  });

  it("POST /api/admin/uploads with multiple images returns multiple urls", async () => {
    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AACgA/9k=",
      "base64",
    );

    const res = await supertest(app)
      .post("/api/admin/uploads")
      .attach("images", jpegBuffer, "photo1.jpg")
      .attach("images", jpegBuffer, "photo2.jpg");

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.urls.length, 2);
  });
});

// ---------------------------------------------------------------------------
// 2. File type validation (multer)
// ---------------------------------------------------------------------------

describe("Admin uploads — file type validation", () => {
  const app = createMockAdminApp(["/api/admin/uploads", uploadRoutes]);

  it("POST /api/admin/uploads with invalid file type returns 500", async () => {
    // Multer's fileFilter rejects non-image types. The error is passed to
    // the error handler which returns 500 for unhandled errors.

    // Create a text file as a buffer
    const textBuffer = Buffer.from("not an image", "utf-8");

    const res = await supertest(app)
      .post("/api/admin/uploads")
      .attach("images", textBuffer, {
        filename: "test.txt",
        contentType: "text/plain",
      });

    // Multer calls cb(new Error(...)) for invalid types, which results
    // in a 500 response from the error middleware.
    assert.equal(res.status, 500);
  });

  it("POST /api/admin/uploads with PDF file returns 500", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 fake pdf content", "utf-8");

    const res = await supertest(app)
      .post("/api/admin/uploads")
      .attach("images", pdfBuffer, {
        filename: "document.pdf",
        contentType: "application/pdf",
      });

    assert.equal(res.status, 500);
  });

  it("POST /api/admin/uploads with webp image returns 200", async () => {
    // Create a minimal valid WebP buffer (RIFF header)
    const webpBuffer = Buffer.from(
      "RIFF\x24\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x90\x01\x2a\x9a\x01\x2a\x00\x01\x00\x10\x0b\x11\x00\x3f\x00\x00\x00\x01\x1a\x44\x9a\x00\x00\x00\x00",
    );

    const res = await supertest(app)
      .post("/api/admin/uploads")
      .attach("images", webpBuffer, {
        filename: "image.webp",
        contentType: "image/webp",
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.urls[0].endsWith(".webp"));
  });
});
