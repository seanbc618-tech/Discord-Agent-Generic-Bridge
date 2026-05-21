import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export class SessionStore {
  constructor(private readonly filePath: string) {}

  get(conversationKey: string): string | undefined {
    return this.readMap()[conversationKey];
  }

  set(conversationKey: string, sessionId: string): void {
    const current = this.readMap();
    current[conversationKey] = sessionId;
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(current, null, 2) + "\n", "utf-8");
  }

  private readMap(): Record<string, string> {
    if (!existsSync(this.filePath)) {
      return {};
    }

    return JSON.parse(readFileSync(this.filePath, "utf-8")) as Record<string, string>;
  }
}
