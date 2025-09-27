import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import usersRouter from "./routes/users.js";
import clubsRouter from './routes/clubs.js';
import eventsRouter from './routes/events/index.js';
import followsRouter from './routes/follows.js';
import { maybeAuth } from "./middleware/maybeAuth.js";

const app = express();

app.use(
    cors({
        origin: (_origin, cb) => cb(null, true),
        credentials: true,
    })
);

// Security / logging / body parsing
app.use(helmet());
app.use(morgan("tiny"));
app.use(express.json({ limit: "1mb" }));

app.use(maybeAuth);

app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
});

app.use(usersRouter);
app.use(clubsRouter);
app.use(eventsRouter);
app.use(followsRouter);

// Error 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not Found", path: req.path });
});

// Centralized error handler, if any route throws or calls next(err), it lands here.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message =
        typeof err?.message === "string" && status < 500 ? err.message : "Internal Server Error";

    console.error("[unhandled-error]", err);
    if (!res.headersSent) res.status(status).json({ error: message });
});


const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

app.listen(port, host, () => {
    console.log(`API listening on http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
});

