import { getHistory, getLastStats, save, updateStats } from "./utils/db";
import { Chart, registerables } from "chart.js";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import "chartjs-adapter-date-fns";
import { graphConfiguration } from "./utils/graph";
import { join } from "node:path";

Chart.register(...registerables);
GlobalFonts.registerFromPath(
  join(process.cwd(), "fonts/Inter-Regular.ttf"),
  "InterRegular",
);
GlobalFonts.registerFromPath(
  join(process.cwd(), "fonts/Inter-Bold.ttf"),
  "InterBold",
);

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

function formatEasternTime(
  date: Date,
  hasTime = true,
  timeSeparator = " ",
  fullTime = false,
) {
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "America/New_York",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: fullTime ? "2-digit" : "numeric",
    minute: fullTime ? "2-digit" : undefined,
    second: fullTime ? "2-digit" : undefined,
    hour12: true,
    timeZone: "America/New_York",
  }).format(date);

  return `${datePart}${hasTime ? `${timeSeparator}${timePart} EST` : ""}`;
}

function getDateInEasternTime(date: Date) {
  return new Date(
    date.toLocaleString("en-US", {
      timeZone: "America/New_York",
    }),
  );
}

const trim = (str: string) =>
  str
    .trim()
    .split("\n")
    .map((str) => str.trim())
    .join("\n");

interface Rate {
  min?: number;
  max?: number;
  emoji?: string;
  color: string;
}

const rates: Rate[] = [
  {
    max: 9999,
    color: "#ffffff",
  },
  {
    min: 9999,
    max: 10999,
    emoji: "🔥",
    color: "#ffa500",
  },
  {
    min: 11000,
    max: 12999,
    emoji: "<:GreenFire:1244348066325073980>",
    color: "#00ff00",
  },
  {
    min: 13000,
    max: 14999,
    emoji: "<:BlueFire:1244348062558584996>",
    color: "#0000ff",
  },
  {
    min: 15000,
    max: 16999,
    emoji: "<:PinkFire:1244350814617604177>",
    color: "#ff00ff",
  },
  {
    min: 17000,
    max: 19999,
    emoji: "<:PurpleFire:1244348073686335499>",
    color: "#d000ff",
  },
  {
    min: 20000,
    emoji: "<:RedFire:1244421295408414750>",
    color: "#ff0000",
  },
];

function hexToDecimalColor(hexString: string) {
  // Ensure the hex string starts with a hash (#) and remove it
  if (hexString.startsWith("#")) {
    hexString = hexString.slice(1);
  }

  // Validate the remaining string is a valid 6-digit hexadecimal
  if (typeof hexString !== "string" || !/^[0-9a-fA-F]{6}$/.test(hexString)) {
    throw new Error("Invalid hexadecimal color string");
  }

  // Convert the hexadecimal string to a decimal number
  const decimalValue = parseInt(hexString, 16);

  return decimalValue;
}

export async function updateTask() {
  const lastStats = getLastStats();
  const history = getHistory();
  const firstData = history[0];
  const currentDate = new Date();
  const currentDateAsEastern = getDateInEasternTime(currentDate);

  const res = await fetch(
    "https://nia-statistics.com/api/get?platform=youtube&type=channel&id=UCX6OQ3DkcsbYNE6H8uQQuVA,UCq-Fj5jknLsUf-MWSy4_brA",
  );
  const [mrbeastData, tseriesData] = (await res.json()) as [NiaData, NiaData];

  const timeTook = currentDate.getTime() - lastStats.mrbeast.update;
  const subRate =
    (mrbeastData.estSubCount - lastStats.mrbeast.subscribers) /
    (timeTook / 1000);
  const tseriesSubRate =
    (tseriesData.estSubCount - lastStats.tseriesSubscribers) /
    (timeTook / 1000);
  const difference = tseriesData.estSubCount - mrbeastData.estSubCount;
  const mrbeastDaily = subRate * 24 * 60 * 60;
  const tseriesDaily = tseriesSubRate * 24 * 60 * 60;
  const dailyDifference = mrbeastDaily - tseriesDaily;
  const daysToOvertake = difference - Math.abs(dailyDifference);
  const overtakingDate = new Date(
    currentDate.getTime() + daysToOvertake * 24 * 60 * 60 * 1000,
  );

  const lastHour = history[history.length - 1];
  const hourlyGains = mrbeastData.estSubCount - lastHour.subscribers;
  const hourlyGainsComparedToLast = hourlyGains - lastHour.gained;
  const firstCountInLast24Hours = history.slice(-24)[0];
  const last12HoursRank =
    [
      ...history.slice(-11),
      {
        current: true,
        date: currentDate.getTime(),
        subscribers: mrbeastData.estSubCount,
        gained: hourlyGains,
      },
    ]
      .sort((a, b) => b.gained - a.gained)
      .findIndex((d) => (d as any).current) + 1;

  history.push({
    date: new Date().getTime(),
    subscribers: mrbeastData.estSubCount,
    gained: hourlyGains,
  });

  const dailyData = (
    Object.values(
      history.reduce((acc, data) => {
        const date = getDateInEasternTime(new Date(data.date))
          .toISOString()
          .split("T")[0];

        if (!acc[date]) {
          acc[date] = {
            date: new Date(data.date).getTime(),
            subscribers: data.subscribers,
          };
        }

        acc[date].subscribers = data.subscribers; // Always update to the latest subscribers value

        return acc;
      }, {} as any),
    ) as {
      date: number;
      subscribers: number;
    }[]
  ).map((d, index, arr) => {
    const last = arr[index - 1];
    return {
      ...d,
      gained: d.subscribers - (last ? last.subscribers : 0),
    };
  });
  const gainedToday = dailyData[dailyData.length - 1].gained;

  const rate = rates.find(
    (r) => (r.min ?? 0) <= hourlyGains && (r.max ? r.max >= hourlyGains : true),
  );

  const embedObject: Required<WebhookData>["embeds"][number] = {
    title: `${rate && rate.emoji ? `${rate.emoji} ` : ""}Current Subscribers: ${mrbeastData.estSubCount.toLocaleString()}`,
    description: trim(`
      Ranking vs Last 12 Hours: **${last12HoursRank}/12**
      Hourly Gains: **${gain(hourlyGains)}** (${gain(hourlyGainsComparedToLast)}) ${hourlyGainsComparedToLast > 0 ? "⏫" : hourlyGainsComparedToLast === 0 ? "" : "⏬"}
      Minutely Gains: **${gain(subRate * 60, 1)}**
      Secondly Gains: **${gain(subRate, 2)}**
      Subscribers Gained Today: **${gain(gainedToday)}**
      Subscribers Gained in Last 24 Hours: **${gain(mrbeastData.estSubCount - firstCountInLast24Hours.subscribers)}**
      Subscribers Gained Since Release: **${gain(mrbeastData.estSubCount - firstData.subscribers)}**
    `),
    fields: [
      {
        name: "VS T-Series",
        value: trim(`
          Subscribers: **${tseriesData.estSubCount.toLocaleString()}** (${gain(tseriesData.estSubCount - lastStats.tseriesSubscribers)})
          Difference: **${difference.toLocaleString()}** (${gain(difference - lastStats.difference)})
          Estimated Passing Time: **${formatEasternTime(overtakingDate, true, " ", true)}**
        `),
      },
      {
        name: "Last 12 Hours",
        value: history
          .slice(-12)
          .map((d) => {
            const date = getDateInEasternTime(new Date(d.date));
            const isCurrentHour =
              date.toISOString().split("T")[0] ===
                currentDateAsEastern.toISOString().split("T")[0] &&
              date.getHours() === currentDateAsEastern.getHours();
            return `${isCurrentHour ? "**" : ""}${formatEasternTime(new Date(d.date))}${isCurrentHour ? "**" : ""}: ${d.subscribers.toLocaleString()} (${gain(d.gained)})`;
          })
          .join("\n"),
      },
      {
        name: "Last 7 Days",
        value: dailyData
          .slice(-7)
          .map((d) => {
            const dt = new Date(d.date);
            dt.setDate(dt.getDate() + 1);
            const date = getDateInEasternTime(new Date(d.date));
            const isCurrentDate =
              date.toISOString().split("T")[0] ===
              currentDateAsEastern.toISOString().split("T")[0];
            return `${isCurrentDate ? "**" : ""}${formatEasternTime(dt, false)}${isCurrentDate ? "**" : ""}: ${d.subscribers.toLocaleString()} (${gain(d.gained)})`;
          })
          .join("\n"),
      },
      {
        name: "Top 15 Highest Hourly Gains",
        value: history
          .toSorted((a, b) => b.gained - a.gained)
          .slice(0, 15)
          .map((d, index) => {
            const date = getDateInEasternTime(new Date(d.date));
            const isCurrentHour =
              date.toISOString().split("T")[0] ===
                currentDateAsEastern.toISOString().split("T")[0] &&
              date.getHours() === currentDateAsEastern.getHours();
            return `${index + 1}. ${isCurrentHour ? "**" : ""}${formatEasternTime(new Date(d.date))}${isCurrentHour ? "**" : ""}: **${gain(d.gained)}**`;
          })
          .join("\n"),
      },
    ],
    footer: {
      text: "Made by ToastedToast (@nottca) for MrBeast Statistics",
    },
    color: hexToDecimalColor(rate?.color ?? "#ffffff"),
  };

  const subscriberHistoryGraph = await createGraph(
    "Subscriber history since release",
    history.map((d) => getDateInEasternTime(new Date(d.date))),
    history.map((d) => d.subscribers),
  );
  const hourlyGainsGraph = await createGraph(
    "Hourly gains in the past 12 hours",
    history
      .slice(-12)
      .map((d) => new Date(getDateInEasternTime(new Date(d.date)))),
    history.slice(-12).map((d) => d.gained),
  );

  updateStats({
    mrbeastSubscribers: mrbeastData.estSubCount,
    tseriesSubscribers: tseriesData.estSubCount,
  });
  save();

  const formData = new FormData();
  formData.append(
    "payload_json",
    JSON.stringify({
      content: `# ${formatEasternTime(currentDate, true, ", ")} REPORT`,
      attachments: [
        {
          id: 0,
          description: "Subscriber history since release",
          filename: "subscriber_history.png",
        },
        {
          id: 1,
          description: "Hourly gains in the past 12 hours",
          filename: "hourly_gains.png",
        },
      ],
      embeds: [embedObject],
    }),
  );
  formData.append(
    "files[0]",
    new Blob([subscriberHistoryGraph]),
    "subscriber_history.png",
  );
  formData.append("files[1]", new Blob([hourlyGainsGraph]), "hourly_gains.png");

  await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: "POST",
    body: formData,
  });
}

function createGraph(
  title: string,
  dates: Date[],
  subscriberHistory: number[],
) {
  const canvas = createCanvas(1200, 700);
  const ctx = canvas.getContext("2d");

  const chart = new Chart(
    ctx as any,
    graphConfiguration(title, {
      labels: dates,
      datasets: [
        {
          label: "",
          data: subscriberHistory,
          backgroundColor: "#2DD4FF",
          borderColor: "#2DD4FF",
          borderWidth: 6,
          tension: 0.2,
          pointRadius: 0,
        },
      ],
    }),
  );

  chart.draw();

  return canvas.encode("png");
}
