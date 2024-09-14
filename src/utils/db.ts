import { exists } from "node:fs/promises";

export interface Database {
  lastUpdate: number;
  subscribers: number;
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
        history: [],
      } satisfies Database),
    );
  }
}

await initDatabase();

const dbFile = Bun.file("./db.json");
let db: Database = await dbFile.json();

function updateDb() {
  const data = db as any;
  db = {
    lastUpdate: data.lastUpdate,
    subscribers: data.subscribers,
    history: data.history,
  };
  save();
}

updateDb();

export function getLastStats() {
  return {
    update: db.lastUpdate,
    subscribers: db.subscribers,
  };
}

export function updateStats(mrbeastSubscribers: number) {
  db.lastUpdate = new Date().getTime();

  const mrbeastGained = mrbeastSubscribers - db.subscribers;
  db.subscribers = mrbeastSubscribers;

  db.history.push({
    date: new Date().getTime(),
    subscribers: mrbeastSubscribers,
    gained: mrbeastGained,
  });
}

export function getHistory() {
  return [...db.history];
}

export async function save() {
  await Bun.write("./db.json", JSON.stringify(db));
}
