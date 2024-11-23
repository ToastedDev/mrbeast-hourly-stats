import { getHistory, getLastStats, save, updateStats } from "./utils/db";
import { Chart, registerables } from "chart.js";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import "chartjs-adapter-date-fns";
import { graphConfiguration } from "./utils/graph";
import { join } from "node:path";
import { DateTime } from "luxon";

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

interface CommunitricsData {
    mrbeast: number;
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
  return DateTime.fromJSDate(date)
    .setZone("America/New_York")
    .toFormat(
      `MMM dd${hasTime ? `,${timeSeparator}h${fullTime ? ":m" : ""} a` : ""}`
    )
    .replace(" AM", "am")
    .replace(" PM", "pm");
}

function getDateInEasternTime(date: Date) {
  return DateTime.fromJSDate(date).setZone("America/New_York").toJSDate();
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
    max: 4999,
    color: "#ffffff",
  },
  {
    min: 5000,
    max: 9999,
    emoji: "<:BronzeFire:1282650044159361044>",
    color: "#7d5c15",
  },
  {
    min: 10000,
    max: 12999,
    emoji: "🔥",
    color: "#f4900e",
  },
  {
    min: 13000,
    max: 15999,
    emoji: "<:GreenFire:1244348066325073980>",
    color: "#35f50e",
  },
  {
    min: 16000,
    max: 19999,
    emoji: "<:BlueFire:1244348062558584996>",
    color: "#0d70fe",
  },
  {
    min: 20000,
    max: 29999,
    emoji: "<:PinkFire:1244350814617604177>",
    color: "#ff6eff",
  },
  {
    min: 30000,
    max: 49999,
    emoji: "<:PurpleFire:1244348073686335499>",
    color: "#a301f4",
  },
  {
    min: 50000,
    max: 64999,
    emoji: "<:RedFire:1244421295408414750>",
    color: "#f53134",
  },
  {
    min: 65000,
    max: 99999,
    emoji: "<:VoidFire:1246404685531709450>",
    color: "#1e073f",
  },
  {
    min: 100000,
    emoji: "<:SuperFire:1246879449962778624>",
    color: "#1bc6fa",
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

  let response, communitricsData, estSubCount;
  try {
    response = await fetch(
      "https://mrbeast.subscribercount.app/data"
    );
    communitricsData = (await response.json()) as CommunitricsData;
    estSubCount = communitricsData.mrbeast;
  } catch (error) {
    console.error("Fetch error from Communitrics API:", error);
    return;
  }

  const timeTook = currentDate.getTime() - lastStats.update;
  const subRate = (estSubCount - lastStats.subscribers) / (timeTook / 1000);

  const lastHour = history[history.length - 1];
  const hourlyGains = estSubCount - lastHour.subscribers;
  const hourlyGainsComparedToLast = hourlyGains - lastHour.gained;
  const firstCountInLast24Hours = history.slice(-24)[0];
  const last24HoursRank =
    [
      ...history.slice(-23),
      {
        current: true,
        date: currentDate.getTime(),
        subscribers: estSubCount,
        gained: hourlyGains,
      },
    ]
      .sort((a, b) => b.gained - a.gained)
      .findIndex((d) => (d as any).current) + 1;

  const allTimeRank =
    history
      .concat({
        date: currentDate.getTime(),
        subscribers: estSubCount,
        gained: hourlyGains,
      })
      .sort((a, b) => b.gained - a.gained)
      .findIndex((d) => d.date === currentDate.getTime()) + 1;

  history.push({
    date: new Date().getTime(),
    subscribers: estSubCount,
    gained: hourlyGains,
  });

  const dailyData = (
    Object.values(
      history.reduce((acc, data) => {
        const date = getDateInEasternTime(new Date(data.date));
        const formattedDate = formatEasternTime(date, false);

        if (!acc[formattedDate]) {
          acc[formattedDate] = {
            date: date.getTime(),
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

  const gainedLast7Days = Object.entries<{
    date: number;
    history: [Date, number][];
  }>(
    history.reduce((acc, data) => {
      const date = getDateInEasternTime(new Date(data.date));
      const formattedDate = formatEasternTime(date, false);

      if (!acc[formattedDate]) {
        acc[formattedDate] = {
          date: new Date(data.date).getTime(),
          history: [[date, data.gained]],
        };
      }

      acc[formattedDate]?.history.push([date, data.gained]);

      return acc;
    }, {} as any)
  )
    .slice(-7)
    .map(([key, value]) => {
      return value.history;
    });

  const rate = rates.find(
    (r) => (r.min ?? 0) <= hourlyGains && (r.max ? r.max >= hourlyGains : true)
  );

  const embedObject: Required<WebhookData>["embeds"][number] = {
    title: `${
      rate && rate.emoji ? `${rate.emoji} ` : ""
    } Current Subscribers: ${estSubCount.toLocaleString()}`,
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
        estSubCount - firstCountInLast24Hours.subscribers
      )}
      **Subscribers Gained Since Release:** ${gain(
        estSubCount - firstData.subscribers
      )}
    `),
    fields: [
      {
        name: "Hourly Gains, Last 12 Hours",
        value: history
          .slice(-12)
          .map((d, i) => {
            const rate = rates.find(
              (r) =>
                (r.min ?? 0) <= d.gained && (r.max ? r.max >= d.gained : true)
            );
            return `* ${i === 11 ? "**" : ""}${formatEasternTime(
              new Date(d.date)
            )}${
              i === 11 ? "**" : ""
            }: ${d.subscribers.toLocaleString()} (${gain(d.gained)}) ${
              rate && rate.emoji ? rate.emoji : ""
            }`;
          })
          .join("\n"),
      },
      {
        name: "Daily Gains, Last 7 Days",
        value: dailyData
          .slice(-7)
          .map((d, i) => {
            const dt = new Date(d.date);
            return `* ${i === 6 ? "**" : ""}${formatEasternTime(dt, false)}${
              i === 6 ? "**" : ""
            }: ${d.subscribers.toLocaleString()} (${gain(d.gained)})`;
          })
          .join("\n"),
      },
      {
        name: "Top 10 Hours with Highest Gains",
        value: history
          .toSorted((a, b) => b.gained - a.gained)
          .slice(0, 10)
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
      text: "Made by @nottca for discord.gg/mrbeaststats",
      icon_url:
        "https://cdn.discordapp.com/icons/1175557946474766416/a_d8b4e1f2ceb5e91b655b3b623de12bd8.webp",
    },
    color: hexToDecimalColor(rate?.color ?? "#ffffff"),
  };

  const subHistoryGraph = await createGraph(
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

  const dailyGainsGraph = await createGraph(
    "Subscriber History (Last 7 Days)",
    history
      .slice(-168)
      .map((d) => new Date(getDateInEasternTime(new Date(d.date)))),
    history.slice(-168).map((d) => d.subscribers)
  );

  const monthlyGainsGraph = await createGraph(
    "Subscriber History (Last 30 Days)",
    history
      .slice(-720)
      .map((d) => new Date(getDateInEasternTime(new Date(d.date)))),
    history.slice(-720).map((d) => d.subscribers)
  );

  const last7DaysGraph = await createLast7DaysGraph(gainedLast7Days);

  updateStats(estSubCount);
  save();

  const formData = new FormData();
  formData.append(
    "payload_json",
    JSON.stringify({
      content: `## ${formatEasternTime(currentDate, true)} EST Report`,
      attachments: [
        {
          id: 0,
          filename: "sub_history.jpg",
        },
        {
          id: 1,
          filename: "hourly_gains.jpg",
        },
        {
          id: 2,
          filename: "daily_gains.jpg",
        },
        {
          id: 3,
          filename: "monthly_gains.jpg",
        },
        {
          id: 4,
          filename: "last_7_days.jpg",
        },
      ],
      embeds: [embedObject],
    })
  );
  formData.append("files[0]", new Blob([subHistoryGraph]), "sub_history.jpg");
  formData.append("files[1]", new Blob([hourlyGainsGraph]), "hourly_gains.jpg");
  formData.append("files[2]", new Blob([dailyGainsGraph]), "daily_gains.jpg");
  formData.append("files[3]", new Blob([monthlyGainsGraph]), "monthly_gains.jpg");
  formData.append("files[4]", new Blob([last7DaysGraph]), "last_7_days.jpg");

const webhookUrls = [
  process.env.DISCORD_WEBHOOK_URL!,
  process.env.SECOND_DISCORD_WEBHOOK_URL!
];

await Promise.all(
  webhookUrls.map((url) =>
    fetch(url, {
      method: "POST",
      body: formData,
    })
  )
); 
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

  return canvas.encode("jpeg");
}

const colors = [
  "#b0e3f5",
  "#9bd6eb", 
  "#85c9e0",
  "#6cb3d5", 
  "#55a3d0", 
  "#3f94cc", 
  "#002d5b",
];

async function createLast7DaysGraph(history: [Date, number][][]) {
  const canvas = createCanvas(1200, 800);
  const ctx = canvas.getContext("2d");

  const currentDate = new Date();
  const formattedDate = formatEasternTime(currentDate, false);

  const chartConfig = graphConfiguration(
    "Past 7 Days Hourly Gains Comparison",
    {
      labels: history[0].map(([d]) => new Date(getDateInEasternTime(d))),
      datasets: history.map((day, i) => {
        const currentDay = day[0][0];
        return {
          label:
            formatEasternTime(currentDay, false) +
            (formatEasternTime(currentDay, false) === formattedDate
              ? `, as of ${formatEasternTime(currentDate, true).split(", ")[1]}`
              : ""),
          data: day.map(([, gain]) => gain),
          borderColor: colors[i],
          borderWidth: i === 6 ? 5 : 1,
          tension: 0.3,
          pointRadius: 0,
        };
      }),
    },
    0,
    false,
    true
  );

  const chart = new Chart(ctx as any, chartConfig);

  chart.draw();

  return canvas.encode("jpeg");
}
