
import fs from "fs";
import path from "path";

export class JsonlStore<T> {
  constructor(private filePath: string) {}

  private ensureDir() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  append(obj: T) {
    this.ensureDir();
    fs.appendFileSync(this.filePath, JSON.stringify(obj) + "\n", "utf8");
  }
}
