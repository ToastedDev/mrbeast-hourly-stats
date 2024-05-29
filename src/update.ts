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
    max: 11999,
    emoji: "🔥",
    color: "#ffa500",
  },
  {
    min: 11999,
    max: 13999,
    emoji: "<:GreenFire:1244348066325073980>",
    color: "#00ff00",
  },
  {
    min: 13999,
    max: 15999,
    emoji: "<:BlueFire:1244348062558584996>",
    color: "#0000ff",
  },
  {
    min: 15999,
    max: 17999,
    emoji: "<:PinkFire:1244350814617604177>",
    color: "#ff00ff",
  },
  {
    min: 17999,
    max: 20999,
    emoji: "<:PurpleFire:1244348073686335499>",
    color: "#d000ff",
  },
  {
    min: 20999,
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

  const res = await fetch(
    "https://nia-statistics.com/api/get?platform=youtube&type=channel&id=UCX6OQ3DkcsbYNE6H8uQQuVA,UCq-Fj5jknLsUf-MWSy4_brA",
  );
  const [mrbeastData, tseriesData] = (await res.json()) as [NiaData, NiaData];

  const timeTook = currentDate.getTime() - lastStats.update;
  const subRate =
    (mrbeastData.estSubCount - lastStats.subscribers) / (timeTook / 1000);
  const lastHour = history[history.length - 1];
  const hourlyGains = mrbeastData.estSubCount - lastHour.subscribers;
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
      {
        name: "Top 15 Highest Hourly Gains",
        value: history
          .toSorted((a, b) => b.gained - a.gained)
          .slice(0, 15)
          .map(
            (d, index) =>
              `${index + 1}. ${formatEasternTime(new Date(d.date))}: **${gain(d.gained)}**`,
          )
          .join("\n"),
      },
    ],
    footer: {
      text: "Made by ToastedToast (@nottca) for MrBeast Statistics",
    },
    color: hexToDecimalColor(rate?.color ?? "#ffffff"),
  };

  history.push({
    date: new Date().getTime(),
    subscribers: mrbeastData.estSubCount,
    gained: hourlyGains,
  });

  const subscriberHistoryGraph = await createGraph(
    "Subscriber history since release",
    history.map(
      (d) =>
        new Date(
          new Date(d.date).toLocaleString("en-US", {
            timeZone: "America/New_York",
          }),
        ),
    ),
    history.map((d) => d.subscribers),
  );
  const hourlyGainsGraph = await createGraph(
    "Hourly gains in the past 12 hours",
    history.slice(-12).map(
      (d) =>
        new Date(
          new Date(d.date).toLocaleString("en-US", {
            timeZone: "America/New_York",
          }),
        ),
    ),
    history.slice(-12).map((d) => d.gained),
  );

  updateStats(mrbeastData.estSubCount, hourlyGains);
  save();

  const formData = new FormData();
  formData.append(
    "payload_json",
    JSON.stringify({
      content: `# ${formatEasternTime(currentDate)} REPORT`,
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
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    }),
  );

  chart.draw();

  return canvas.encode("png");
}
