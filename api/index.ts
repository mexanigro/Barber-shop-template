/**
 * Vercel Serverless Function: serves all `/api/*` Express routes.
 * Static SPA rewrites must not run before this — see `vercel.json`.
 *
 * If bootstrap fails (e.g. missing CLIENT_ID at runtime), return JSON instead of a 500 crash page.
 */
import express from "express";
import serverless from "serverless-http";
import { registerExpressRoutes } from "../server";

function buildApp(): express.Express {
  const app = express();
  try {
    registerExpressRoutes(app, 3000);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    app.all("*", (_req, res) => {
      res.status(503).json({
        error: "API bootstrap failed",
        message,
        hint:
          "Set CLIENT_ID (recommended for Vercel serverless), or NEXT_PUBLIC_CLIENT_ID / VITE_CLIENT_ID, in Project Settings → Environment Variables for Production and redeploy. VITE_* alone is sometimes not available to /api at runtime.",
      });
    });
  }
  return app;
}

export default serverless(buildApp());
