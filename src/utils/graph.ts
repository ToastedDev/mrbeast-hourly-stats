import {
  Chart,
  type ChartConfiguration,
  type ChartData,
  type Plugin,
} from "chart.js";
import { enUS } from "date-fns/locale";

Chart.defaults.font.family = "InterRegular";

const backgroundColorPlugin = {
  id: "backgroundColorPlugin",
  beforeDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
} satisfies Plugin;

export const graphConfiguration = (
  title: string,
  data: ChartData,
): ChartConfiguration => ({
  type: "line",
  data,
  options: {
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 24, weight: "bold", family: "InterBold" },
        color: "black",
      },
      legend: {
        display: false,
      },
      subtitle: {
        display: true,
        text: "MrBeast Statistics",
        position: "bottom",
        align: "end",
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          font: { size: 14, weight: "normal" },
          color: "#333333",
          autoSkip: true,
          maxTicksLimit: 8,
          maxRotation: 0,
          minRotation: 0,
        },
        grid: { color: "#eaeaea" },
      },
      x: {
        type: "time",
        time: {
          unit: "day",
          displayFormats: {
            day: "yyyy-MM-dd HH:mm",
          },
        },
        adapters: {
          date: {
            locale: enUS,
          },
        },
        ticks: {
          font: { size: 14, weight: "normal" },
          color: "#333333",
          autoSkip: true,
          maxTicksLimit: 18,
          maxRotation: 45,
          minRotation: 45,
        },
        grid: { display: true },
      },
    },
  },
  plugins: [backgroundColorPlugin],
});
