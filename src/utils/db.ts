import { exists, readFile } from "node:fs/promises";

interface Database {
  subscribers: number;
  hourlyGains: number;
  history: {
    date: number;
    subscribers: number;
    hourlyGains: number;
  }[];
}

async function initDatabase() {
  if (!(await exists("./db.json"))) {
    await Bun.write(
      "./db.json",
      JSON.stringify({
        subscribers: 0,
        hourlyGains: 0,
        history: [],
      } satisfies Database),
    );
  }
}

await initDatabase();

const dbFile = Bun.file("./db.json");
const db: Database = await dbFile.json();

export function getLastStats() {
  return { subscribers: db.subscribers, hourlyGains: db.hourlyGains };
}

export function updateStats(subscribers: number, hourlyGains: number) {
  db.subscribers = subscribers;
  db.hourlyGains = hourlyGains;
  db.history.push({ date: Date.now(), subscribers, hourlyGains });
}

export async function save() {
  await Bun.write("./db.json", JSON.stringify(db));
}
