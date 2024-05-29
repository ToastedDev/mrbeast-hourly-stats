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

function convertDateToReadable(date: number) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dateObj = new Date(date);
  return `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
}

function convertDateToReadableWithTime(date: number) {
  const dateObj = new Date(date);
  const hours = dateObj.getHours() % 12;
  return `${convertDateToReadable(date)}, ${hours === 0 ? "12" : hours} ${dateObj.getHours() >= 12 ? "PM" : "AM"}`;
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
          .slice(0, 12)
          .map(
            (d) =>
              `${convertDateToReadableWithTime(d.date)}: ${d.subscribers} (${gain(d.gained)})`,
          )
          .join("\n"),
      },
    ],
    footer: {
      text: "Made by ToastedToast (@nottca) for MrBeast Statistics",
    },
    timestamp: currentDate.toISOString(),
  };

  console.log(embedObject);

  updateStats(mrbeastData.estSubCount, hourlyGains);
  save();
}
