import { getHistory, getLastStats, save, updateStats } from "./utils/db";

interface NiaData {
  estSubCount: number;
}

interface WebhookData {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: {
    title?: string;
    description?: string;
    color?: number;
    fields?: {
      name: string;
      value: string;
      inline?: boolean;
    }[];
    footer?: {
      text: string;
      icon_url?: string;
    };
    timestamp?: string;
  }[];
}

const gain = (gain: number, precision: number = 0) =>
  `${gain > 0 ? "+" : ""}${parseFloat(gain.toFixed(precision)).toLocaleString()}`;

function formatEasternTime(date: Date, hasTime = true) {
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "America/New_York",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    timeZone: "America/New_York",
  }).format(date);

  return `${datePart}${hasTime ? ` ${timePart} EST` : ""}`;
}

const trim = (str: string) =>
  str
    .trim()
    .split("\n")
    .map((str) => str.trim())
    .join("\n");

export async function updateTask() {
  const lastStats = getLastStats();
  const history = getHistory();
  const firstData = history[0];
  const currentDate = new Date();

  const res = await fetch(
    "https://nia-statistics.com/api/get?platform=youtube&type=channel&id=UCX6OQ3DkcsbYNE6H8uQQuVA,UCq-Fj5jknLsUf-MWSy4_brA",
  );
  const [mrbeastData, tseriesData] = (await res.json()) as [NiaData, NiaData];

  const timeTook = currentDate.getTime() - lastStats.update;
  const subRate =
    (mrbeastData.estSubCount - lastStats.subscribers) / (timeTook / 1000);
  const hourlyGains = subRate * 1 * 60 * 60;
  const hourlyGainsComparedToLast = hourlyGains - lastStats.hourlyGains;
  const firstDataToday = history.find(
    (d) =>
      d.date >=
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
      ).getTime(),
  ) ?? {
    date: 0,
    subscribers: 0,
    hourlyGains: 0,
  };

  const dailyData = Object.values(
    history.reduce((acc, data) => {
      const date = new Date(data.date).toISOString().split("T")[0];

      if (!acc[date]) {
        acc[date] = {
          date: new Date(data.date).getTime(),
          subscribers: data.subscribers,
          gained: 0,
        };
      }

      acc[date].gained += data.gained;
      acc[date].subscribers = data.subscribers; // Always update to the latest subscribers value

      return acc;
    }, {} as any),
  ) as {
    date: number;
    subscribers: number;
    gained: number;
  }[];

  const embedObject: Required<WebhookData>["embeds"][number] = {
    title: `Current Subscribers: ${mrbeastData.estSubCount.toLocaleString()}`,
    description: trim(`
      Hourly Gains: **${gain(hourlyGains)}** (${gain(hourlyGainsComparedToLast)}) ${hourlyGainsComparedToLast > 0 ? "⏫" : hourlyGainsComparedToLast === 0 ? "" : "⏬"}
      Minutely Gains: **${gain(subRate * 60, 1)}**
      Secondly Gains: **${gain(subRate, 2)}**
      Subscribers Gained Today: **${gain(mrbeastData.estSubCount - firstDataToday.subscribers)}**
      Subscribers Gained Since Release: **${gain(mrbeastData.estSubCount - firstData.subscribers)}**
    `),
    fields: [
      {
        name: "VS T-Series",
        value: trim(`
          Subscribers: **${tseriesData.estSubCount.toLocaleString()}**
          Difference: **${(mrbeastData.estSubCount - tseriesData.estSubCount).toLocaleString()}**
        `),
      },
      {
        name: "Last 12 Hours",
        value: history
          .slice(-12)
          .map(
            (d) =>
              `${formatEasternTime(new Date(d.date))}: ${d.subscribers.toLocaleString()} (${gain(d.gained)})`,
          )
          .join("\n"),
      },
      {
        name: "Last 7 Days",
        value: dailyData
          .slice(-7)
          .map(
            (d) =>
              `${formatEasternTime(new Date(d.date), false)}: ${d.subscribers.toLocaleString()} (${gain(d.gained)})`,
          )
          .join("\n"),
      },
    ],
    footer: {
      text: "Made by ToastedToast (@nottca) for MrBeast Statistics",
    },
    timestamp: currentDate.toISOString(),
  };

  updateStats(mrbeastData.estSubCount, hourlyGains);
  save();

  await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [embedObject],
    }),
  });
}
