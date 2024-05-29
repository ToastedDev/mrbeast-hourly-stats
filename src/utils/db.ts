import { exists } from "node:fs/promises";

interface Database {
  lastUpdate: number;
  subscribers: number;
  hourlyGains: number;
  history: {
    date: number;
    subscribers: number;
    gained: number;
  }[];
}

async function initDatabase() {
  if (!(await exists("./db.json"))) {
    await Bun.write(
      "./db.json",
      JSON.stringify({
        lastUpdate: 0,
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
  return {
    update: db.lastUpdate,
    subscribers: db.subscribers,
    hourlyGains: db.hourlyGains,
  };
}

export function updateStats(subscribers: number, hourlyGains: number) {
  db.lastUpdate = Date.now();
  const gained = subscribers - db.subscribers;
  db.subscribers = subscribers;
  db.hourlyGains = hourlyGains;
  db.history.push({ date: Date.now(), subscribers, gained });
}

export function getHistory() {
  return [...db.history];
}

export async function save() {
  await Bun.write("./db.json", JSON.stringify(db));
}
