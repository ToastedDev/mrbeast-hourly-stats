import { exists } from "node:fs/promises";

interface Database {
  mrbeastData: {
    lastUpdate: number;
    subscribers: number;
  };
  tseriesSubscribers: number;
  difference: number;
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
        tseriesSubscribers: 0,
        difference: 0,
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
  delete data.mrbeastData.hourlyGains;
  if (data.tseriesData) {
    data.tseriesSubscribers = data.tseriesData.subscribers;
    delete data.tseriesData;
  }
  if (data.differenceData) {
    data.difference = data.differenceData.difference;
    delete data.differenceData;
  }
  db = {
    mrbeastData: data.mrbeastData,
    tseriesSubscribers: data.tseriesSubscribers,
    difference: data.difference,
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
    tseriesSubscribers: db.tseriesSubscribers,
    difference: db.difference,
  };
}

export function updateStats(data: {
  mrbeastSubscribers: number;
  tseriesSubscribers: number;
}) {
  db.mrbeastData.lastUpdate = new Date().getTime();

  const mrbeastGained = data.mrbeastSubscribers - db.mrbeastData.subscribers;
  db.mrbeastData.subscribers = data.mrbeastSubscribers;
  db.tseriesSubscribers = data.tseriesSubscribers;
  db.difference = data.tseriesSubscribers - data.mrbeastSubscribers;

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
