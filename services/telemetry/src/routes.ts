
import type { Request, Response } from "express";
import type { TelemetryService } from "./telemetry";

export function registerRoutes(app: any, telemetry: TelemetryService) {
  app.get("/events", (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 200);
    res.json(telemetry.getEvents(isFinite(limit) ? limit : 200));
  });

  app.get("/trace/:traceId", (req: Request, res: Response) => {
    res.json(telemetry.getTrace(req.params.traceId));
  });

  app.get("/events/stream", (req: Request, res: Response) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    res.write("\n");
    telemetry.sse.add(res);
  });
}
