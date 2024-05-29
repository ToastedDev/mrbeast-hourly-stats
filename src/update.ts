import { getLastStats, save, updateStats } from "./utils/db";

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
  }[];
}

const gain = (gain: number, precision: number = 0) =>
  `${gain > 0 ? "+" : ""}${parseFloat(gain.toFixed(precision)).toLocaleString()}`;

export async function updateTask() {
  const lastStats = getLastStats();

  const res = await fetch(
    "https://nia-statistics.com/api/get?platform=youtube&type=channel&id=UCX6OQ3DkcsbYNE6H8uQQuVA,UCq-Fj5jknLsUf-MWSy4_brA",
  );
  const [mrbeastData, tseriesData] = (await res.json()) as [NiaData, NiaData];

  const currentDate = new Date().getTime();
  const timeTook = currentDate - lastStats.update;
  const subRate =
    (mrbeastData.estSubCount - lastStats.subscribers) / (timeTook / 1000);
  const hourlyGains = subRate * 1 * 60 * 60;
  const hourlyGainsComparedToLast = hourlyGains - lastStats.hourlyGains;

  const embedObject: Required<WebhookData>["embeds"][number] = {
    title: `Current Subscribers: ${mrbeastData.estSubCount}`,
    description: `
      Hourly Gains: **${gain(hourlyGains)}** (${gain(hourlyGainsComparedToLast)}) ${hourlyGainsComparedToLast > 0 ? "⏫" : hourlyGainsComparedToLast === 0 ? "" : "⏬"}
      Minutely Gains: **${gain(subRate * 60, 1)}**
      Secondly Gains: **${gain(subRate, 2)}**
    `.trim(),
  };

  console.log(embedObject);

  updateStats(mrbeastData.estSubCount, hourlyGains);
  save();
}
