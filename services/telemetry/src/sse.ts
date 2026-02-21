import type { Response } from "express";

export class SseHub<T> {
  private clients = new Set<Response>();

  add(res: Response) {
    this.clients.add(res);
    res.on("close", () => this.clients.delete(res));
  }

  broadcast(evt: T) {
    const data = `data: ${JSON.stringify(evt)}\n\n`;
    for (const res of this.clients) res.write(data);
  }
}
