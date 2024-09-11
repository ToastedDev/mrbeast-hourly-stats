import { getHistory, getLastStats, save, updateStats } from "./utils/db";
import { Chart, registerables } from "chart.js";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import "chartjs-adapter-date-fns";
import { graphConfiguration } from "./utils/graph";
import { join } from "node:path";
import fs from "fs";

Chart.register(...registerables);
GlobalFonts.registerFromPath(
  join(process.cwd(), "fonts/Poppins-Medium.ttf"),
  "PoppinsMedium"
);
GlobalFonts.registerFromPath(
  join(process.cwd(), "fonts/Poppins-ExtraBold.ttf"),
  "PoppinsExtraBold"
);

GlobalFonts.registerFromPath(
  join(process.cwd(), "fonts/Poppins-SemiBold.ttf"),
  "PoppinsSemiBold"
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
  `${gain > 0 ? "+" : ""}${parseFloat(
    gain.toFixed(precision)
  ).toLocaleString()}`;

function formatEasternTime(
  date: Date,
  hasTime = true,
  timeSeparator = " ",
  fullTime = false
) {
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "America/New_York",
  }).format(date);
  let timePart = new Intl.DateTimeFormat("en-US", {
    hour: fullTime ? "2-digit" : "numeric",
    minute: fullTime ? "2-digit" : undefined,
    second: fullTime ? "2-digit" : undefined,
    hour12: true,
    timeZone: "America/New_York",
  }).format(date);

  timePart = timePart.replace(" AM", "am").replace(" PM", "pm");

  return `${datePart}${hasTime ? `,${timeSeparator}${timePart}` : ""}`;
}

function getDateInEasternTime(date: Date) {
  return new Date(
    date.toLocaleString("en-US", {
      timeZone: "America/New_York",
    })
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
    max: 5999,
    color: "#ffffff",
  },
  {
    min: 6000,
    max: 8999,
    emoji: "<:BronzeFire:1282650044159361044>",
    color: "#8c5b1f",
  },
  {
    min: 9000,
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
    max: 24999,
    emoji: "<:PurpleFire:1244348073686335499>",
    color: "#d000ff",
  },
  {
    min: 25000,
    max: 49999,
    emoji: "<:RedFire:1244421295408414750>",
    color: "#ff0000",
  },
  {
    min: 50000,
    max: 99999,
    emoji: "<:VoidFire:1246404685531709450>",
    color: "#1f074d",
  },
  {
    min: 100000,
    emoji: "<:SuperFire:1246879449962778624>",
    color: "#03befc",
  },
];

function hexToDecimalColor(hexString: string) {
  if (hexString.startsWith("#")) {
    hexString = hexString.slice(1);
  }

  if (typeof hexString !== "string" || !/^[0-9a-fA-F]{6}$/.test(hexString)) {
    throw new Error("Invalid hexadecimal color string");
  }

  const decimalValue = parseInt(hexString, 16);

  return decimalValue;
}

export async function updateTask() {
  const lastStats = getLastStats();
  const history = getHistory();
  const firstData = history[0];
  const currentDate = new Date();
  const currentDateAsEastern = getDateInEasternTime(currentDate);

  let response, niaData;
  try {
    response = await fetch(
      "https://nia-statistics.com/api/get?platform=youtube&type=channel&id=UCX6OQ3DkcsbYNE6H8uQQuVA"
    );
    const fallbackData = await response.json();
    niaData = {
      estSubCount: fallbackData.estSubCount,
    };
  } catch (error) {
    console.error("Fetch error from nia-statistics API:", error);
    return;
  }

  const timeTook = currentDate.getTime() - lastStats.mrbeast.update;
  const subRate =
    (niaData.estSubCount - lastStats.mrbeast.subscribers) / (timeTook / 1000);

  const lastHour = history[history.length - 1];
  const hourlyGains = niaData.estSubCount - lastHour.subscribers;
  const hourlyGainsComparedToLast = hourlyGains - lastHour.gained;
  const firstCountInLast24Hours = history.slice(-24)[0];
  const last24HoursRank =
    [
      ...history.slice(-23),
      {
        current: true,
        date: currentDate.getTime(),
        subscribers: niaData.estSubCount,
        gained: hourlyGains,
      },
    ]
      .sort((a, b) => b.gained - a.gained)
      .findIndex((d) => (d as any).current) + 1;

  const allTimeRank =
    history
      .concat({
        date: currentDate.getTime(),
        subscribers: niaData.estSubCount,
        gained: hourlyGains,
      })
      .sort((a, b) => b.gained - a.gained)
      .findIndex((d) => d.date === currentDate.getTime()) + 1;

  history.push({
    date: new Date().getTime(),
    subscribers: niaData.estSubCount,
    gained: hourlyGains,
  });

  const dailyData = (
    Object.values(
      history.reduce((acc, data) => {
        const date = getDateInEasternTime(new Date(data.date));
        if (date.getHours() === 0) date.setDate(date.getDate() - 1);
        const formattedDate = formatEasternTime(date, false);

        if (!acc[formattedDate]) {
          acc[formattedDate] = {
            date: getDateInEasternTime(new Date(data.date)).getTime(),
            subscribers: data.subscribers,
          };
        }

        acc[formattedDate].subscribers = data.subscribers;

        return acc;
      }, {} as any)
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

  const rate = rates.find(
    (r) => (r.min ?? 0) <= hourlyGains && (r.max ? r.max >= hourlyGains : true)
  );

  const embedObject: Required<WebhookData>["embeds"][number] = {
    title: `${
      rate && rate.emoji ? `${rate.emoji} ` : ""
    } Current Subscribers: ${niaData.estSubCount.toLocaleString()}`,
    description: trim(`
      **Ranking vs Last 24 Hours:** ${last24HoursRank}/24
      **Ranking vs All Time:** ${allTimeRank.toLocaleString()}/${(
      history.length + 1
    ).toLocaleString()}      
      **Daily Average** ${gain(subRate * 60 * 60 * 24, 0)}
      **Hourly Gains:** ${gain(hourlyGains)} (${gain(
      hourlyGainsComparedToLast
    )}) ${
      hourlyGainsComparedToLast > 0
        ? "⬆️"
        : hourlyGainsComparedToLast === 0
        ? ""
        : "⬇️"
    }
      **Subscribers Gained in Last 24 Hours:** ${gain(
        niaData.estSubCount - firstCountInLast24Hours.subscribers
      )}
      **Subscribers Gained Since Release:** ${gain(
        niaData.estSubCount - firstData.subscribers
      )}
    `),
    fields: [
      {
        name: "Hourly Gains, Last 6 Hours",
        value: history
          .slice(-6)
          .map((d, i) => {
            const rate = rates.find(
              (r) =>
                (r.min ?? 0) <= d.gained && (r.max ? r.max >= d.gained : true)
            );
            return `* ${i === 5 ? "**" : ""}${formatEasternTime(
              new Date(d.date)
            )}${i === 5 ? "**" : ""}: ${d.subscribers.toLocaleString()} (${gain(
              d.gained
            )}) ${rate && rate.emoji ? rate.emoji : ""}`;
          })
          .join("\n"),
      },
      {
        name: "Daily Gains, Last 7 Days",
        value: dailyData
          .slice(-7)
          .map((d, i) => {
            const dt = new Date(d.date);
            dt.setDate(dt.getDate() + 1);
            return `* ${i === 6 ? "**" : ""}${formatEasternTime(dt, false)}${
              i === 6 ? "**" : ""
            }: ${d.subscribers.toLocaleString()} (${gain(d.gained)})`;
          })
          .join("\n"),
      },
      {
        name: "Top 5 Hours with Highest Gains",
        value: history
          .toSorted((a, b) => b.gained - a.gained)
          .slice(0, 5)
          .map((d, index) => {
            const date = getDateInEasternTime(new Date(d.date));
            const isCurrentHour =
              date.toISOString().split("T")[0] ===
                currentDateAsEastern.toISOString().split("T")[0] &&
              date.getHours() === currentDateAsEastern.getHours();
            return `${index + 1}. ${
              isCurrentHour ? "**" : ""
            }${formatEasternTime(new Date(d.date))}${
              isCurrentHour ? "**" : ""
            }: ${gain(d.gained)}`;
          })
          .join("\n"),
      },
    ],
    footer: {
      text: "Made by ToastedToast (@nottca) for discord.gg/mrbeaststats",
    },
    color: hexToDecimalColor(rate?.color ?? "#ffffff"),
  };

  const subscriberHistoryGraph = await createGraph(
    "Subscriber History Since Release",
    history.map((d) => getDateInEasternTime(new Date(d.date))),
    history.map((d) => d.subscribers),
    255000000
  );

  const hourlyGainsGraph = await createGraph(
    "Hourly Gains (Past 24 Hours)",
    history
      .slice(-24)
      .map((d) => new Date(getDateInEasternTime(new Date(d.date)))),
    history.slice(-24).map((d) => d.gained),
    undefined,
    true
  );

  fs.writeFileSync("subscriber_history.png", subscriberHistoryGraph);
  fs.writeFileSync("hourly_gains.png", hourlyGainsGraph);

  updateStats({
    mrbeastSubscribers: niaData.estSubCount,
  });
  save();

  const formData = new FormData();
  formData.append(
    "payload_json",
    JSON.stringify({
      content: `## ${formatEasternTime(currentDate, true)} EST Report`,
      attachments: [
        {
          id: 0,
          filename: "subscriber_history.png",
        },
        {
          id: 1,
          filename: "hourly_gains.png",
        },
      ],
      embeds: [embedObject],
    })
  );
  formData.append(
    "files[0]",
    new Blob([subscriberHistoryGraph]),
    "subscriber_history.png"
  );
  formData.append("files[1]", new Blob([hourlyGainsGraph]), "hourly_gains.png");

  await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: "POST",
    body: formData,
  });
}

async function createGraph(
  title: string,
  dates: Date[],
  subscriberHistory: number[],
  startValue?: number,
  isHourlyGainsGraph = false
) {
  const canvas = createCanvas(1200, 800);
  const ctx = canvas.getContext("2d");

  const currentDate = new Date();
  const formattedDate = formatEasternTime(currentDate, true);

  const chartConfig = graphConfiguration(
    `${title} as of ${formattedDate}`,
    {
      labels: dates,
      datasets: [
        {
          label: "Subscribers",
          data: subscriberHistory,
          backgroundColor: "rgba(45, 212, 255, 0.2)",
          borderColor: "#2DD4FF",
          borderWidth: 4,
          fill: true,
        },
      ],
    },
    startValue,
    isHourlyGainsGraph
  );

  const chart = new Chart(ctx as any, chartConfig);

  chart.draw();

  return canvas.encode("png");
}
