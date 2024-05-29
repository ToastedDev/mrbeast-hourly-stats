import { exists } from "node:fs/promises";

interface Database {
  mrbeastData: {
    lastUpdate: number;
    subscribers: number;
    hourlyGains: number;
  };
  tseriesData: {
    lastUpdate: number;
    subscribers: number;
    hourlyGains: number;
  };
  differenceData: {
    difference: number;
    hourlyGains: number;
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
          hourlyGains: 0,
        },
        tseriesData: {
          lastUpdate: 0,
          subscribers: 0,
          hourlyGains: 0,
        },
        differenceData: {
          difference: 0,
          hourlyGains: 0,
        },
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
    mrbeast: {
      update: db.mrbeastData.lastUpdate,
      subscribers: db.mrbeastData.subscribers,
      hourlyGains: db.mrbeastData.hourlyGains,
    },
    tseries: {
      update: db.tseriesData.lastUpdate,
      subscribers: db.tseriesData.subscribers,
      hourlyGains: db.tseriesData.hourlyGains,
    },
    difference: db.differenceData.difference,
  };
}

export function updateStats(data: {
  mrbeastSubscribers: number;
  tseriesSubscribers: number;
}) {
  db.mrbeastData.lastUpdate = new Date().getTime();
  db.tseriesData.lastUpdate = new Date().getTime();

  const mrbeastGained = data.mrbeastSubscribers - db.mrbeastData.subscribers;
  db.mrbeastData.subscribers = data.mrbeastSubscribers;
  db.mrbeastData.hourlyGains = mrbeastGained;

  db.tseriesData.hourlyGains =
    data.tseriesSubscribers - db.tseriesData.subscribers;
  db.tseriesData.subscribers = data.tseriesSubscribers;

  const difference = data.tseriesSubscribers - data.mrbeastSubscribers;
  db.differenceData.hourlyGains = difference - db.differenceData.difference;
  db.differenceData.difference = difference;

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
