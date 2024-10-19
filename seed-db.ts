import { exists } from "node:fs/promises";
import type { Database } from "./src/utils/db";

async function main() {
  const csvFile = Bun.file("./MrBeast_Subscribers.csv");
  const csv = await csvFile.text();
  const lines = csv.split("\n");
  lines.shift();

  let previousSubscribers = 0;
  const history = lines.map((line, index) => {
    const [rawTime, rawSubscribers] = line.split(",");
    const time = new Date(rawTime);
    const subscribers = parseInt(rawSubscribers);

    let subscribersGained = 0;
    if (index > 0) {
      subscribersGained = subscribers - previousSubscribers;
    }

    previousSubscribers = subscribers;

    return { time, subscribers, subscribersGained };
  });

  const hourlyData: {
    date: number;
    subscribers: number;
    gained: number;
  }[] = [];
  let currentHour: Date | null = null;
  let hourlySubscribersGained = 0;
  let lastSubscribers = 0;

  history.forEach((dataPoint, index) => {
    const { time, subscribers, subscribersGained } = dataPoint;
    const hour = new Date(time);
    hour.setMinutes(0, 0, 0);

    if (!currentHour || currentHour.getTime() !== hour.getTime()) {
      if (currentHour) {
        hourlyData.push({
          date: currentHour.getTime(),
          subscribers: lastSubscribers,
          gained: hourlySubscribersGained,
        });
      }
      currentHour = hour;
      hourlySubscribersGained = 0;
    }

    hourlySubscribersGained += subscribersGained;
    lastSubscribers = subscribers;

    if (index === history.length - 1) {
      hourlyData.push({
        date: currentHour.getTime(),
        subscribers: lastSubscribers,
        gained: hourlySubscribersGained,
      });
    }
  });

  if (!(await exists("./db.json"))) {
    return await Bun.write(
      "./db.json",
      JSON.stringify({
        lastUpdate: hourlyData[hourlyData.length - 1].date,
        subscribers: lastSubscribers,
        history: hourlyData,
      } satisfies Database),
    );
  }

  const dbFile = Bun.file("./db.json");
  const db = (await dbFile.json()) as Database;
  db.lastUpdate = hourlyData[hourlyData.length - 1].date;
  db.subscribers = lastSubscribers;
  db.history = hourlyData;
  await Bun.write("./db.json", JSON.stringify(db, null, 2));
}

main();
