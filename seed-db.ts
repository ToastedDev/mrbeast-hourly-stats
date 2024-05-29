async function main() {
  const csvFile = Bun.file("./MrBeast_Subscribers.csv");
  const csv = await csvFile.text();
  const lines = csv.split("\n");
  lines.shift(); // Remove header line

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

  // Convert to hourly data
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
    hour.setMinutes(0, 0, 0); // Set minutes, seconds, and milliseconds to 0

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

    // If it's the last data point, push the accumulated data
    if (index === history.length - 1) {
      hourlyData.push({
        date: currentHour.getTime(),
        subscribers: lastSubscribers,
        gained: hourlySubscribersGained,
      });
    }
  });

  const dbFile = Bun.file("./db.json");
  const db = await dbFile.json();
  db.lastUpdate = hourlyData[hourlyData.length - 1].date;
  db.subscribers = lastSubscribers;
  db.hourlyGains = hourlySubscribersGained;
  db.history = hourlyData;
  await Bun.write("./db.json", JSON.stringify(db, null, 2));
}

main();
