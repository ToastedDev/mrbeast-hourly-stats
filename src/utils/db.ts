import { exists } from "node:fs/promises";

interface Database {
  mrbeastData: {
    lastUpdate: number;
    subscribers: number;
  };
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
        mrbeastData: {
          lastUpdate: 0,
          subscribers: 0,
        },
        history: [],
      } satisfies Database)
    );
  }
}

await initDatabase();

const dbFile = Bun.file("./db.json");
let db: Database = await dbFile.json();

function updateDb() {
  const data = db as any;
  db = {
    mrbeastData: data.mrbeastData,
    history: data.history,
  };
  save();
}

updateDb();

export function getLastStats() {
  return {
    mrbeast: {
      update: db.mrbeastData.lastUpdate,
      subscribers: db.mrbeastData.subscribers,
    },
  };
}

export function updateStats(data: { mrbeastSubscribers: number }) {
  db.mrbeastData.lastUpdate = new Date().getTime();

  const mrbeastGained = data.mrbeastSubscribers - db.mrbeastData.subscribers;
  db.mrbeastData.subscribers = data.mrbeastSubscribers;

  db.history.push({
    date: new Date().getTime(),
    subscribers: data.mrbeastSubscribers,
    gained: mrbeastGained,
  });
}

export function getHistory() {
  return [...db.history];
}

export async function save() {
  await Bun.write("./db.json", JSON.stringify(db));
}
