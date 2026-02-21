export class RingBuffer<T> {
  private buf: T[] = [];
  constructor(private max: number) {}

  push(item: T) {
    this.buf.push(item);
    if (this.buf.length > this.max) this.buf.shift();
  }

  list(limit?: number): T[] {
    if (!limit) return [...this.buf];
    return this.buf.slice(Math.max(0, this.buf.length - limit));
  }
}
