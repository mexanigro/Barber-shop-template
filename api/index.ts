/**
 * Vercel Serverless Function: serves all `/api/*` Express routes.
 * Static SPA rewrites must not run before this — see `vercel.json`.
 */
import express from "express";
import serverless from "serverless-http";
import { registerExpressRoutes } from "../server";

const app = express();
registerExpressRoutes(app, 3000);

export default serverless(app);
