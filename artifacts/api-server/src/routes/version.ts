import fs from "fs";
import path from "path";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

/**
 * Path to the version manifest relative to the compiled dist directory.
 * version.json lives in the project root (artifacts/api-server/), so we
 * walk up two levels from __dirname (which is dist/ at runtime).
 */
const VERSION_FILE = path.resolve(__dirname, "../version.json");
const DOWNLOADS_DIR = path.resolve(__dirname, "../downloads");

/** GET /api/version — returns the latest release manifest */
router.get("/version", (_req: Request, res: Response) => {
  try {
    const raw = fs.readFileSync(VERSION_FILE, "utf8");
    const info = JSON.parse(raw);
    res.json(info);
  } catch {
    res.status(503).json({ error: "Version info not available" });
  }
});

/**
 * GET /api/download/:filename — serves an APK (or any file) from the
 * downloads/ directory next to version.json.
 *
 * Usage: place your built APK as
 *   artifacts/api-server/downloads/ughelli-vibes-latest.apk
 * and set "apkUrl": "download/ughelli-vibes-latest.apk" in version.json.
 */
router.get("/download/:filename", (req: Request, res: Response) => {
  const { filename } = req.params;

  // Prevent directory traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const filePath = path.join(DOWNLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  // Stream the file with Content-Disposition so browsers / Android download it
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.sendFile(filePath);
});

export default router;
