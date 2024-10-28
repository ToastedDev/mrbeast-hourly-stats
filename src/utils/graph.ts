import {
  Chart,
  type ChartConfiguration,
  type ChartData,
  type Plugin,
} from "chart.js";
import { enUS } from "date-fns/locale";
import { DateTime } from "luxon";

Chart.defaults.font.family = "PoppinsSemiBold";

const backgroundColorPlugin = {
  id: "backgroundColorPlugin",
  beforeDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
} satisfies Plugin;

const roundedCornersPlugin = {
  id: "roundedCornersPlugin",
  afterUpdate: (chart) => {
    if (chart.options.elements && chart.options.elements.line) {
      chart.options.elements.line.capBezierPoints = true;
    }
  },
} satisfies Plugin;

export const graphConfiguration = (
  title: string,
  data: ChartData,
  startValue?: number,
  isHourlyGainsGraph = false,
  isLast7Days = false
): ChartConfiguration => ({
  type: "line",
  data,
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 24, weight: "bold", family: "PoppinsExtraBold" },
        color: "#333333",
        padding: {
          top: 20,
          bottom: 10,
        },
      },
      legend: {
        display: isLast7Days,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        suggestedMin: startValue,
        ticks: {
          font: { size: 14, weight: "normal", family: "PoppinsMedium" },
          color: "#555555",
          autoSkip: true,
          maxTicksLimit: isHourlyGainsGraph ? 10 : 10,
          padding: 10,
        },
        grid: { color: "#e0e0e0" },
      },
      x: {
        type: "time",
        time: {
          unit: isHourlyGainsGraph || isLast7Days ? "hour" : "day",
          tooltipFormat:
            isHourlyGainsGraph || isLast7Days
              ? "MMM dd, yyyy HH:mm"
              : "MMM dd, yyyy",
          displayFormats: {
            hour: "HH:mm",
            day: "MMM dd, yyyy",
          },
        },
        adapters: {
          date: {
            locale: enUS,
          },
        },
        ticks: {
          font: { size: 14, weight: "normal", family: "PoppinsMedium" },
          color: "#555555",
          autoSkip: true,
          maxTicksLimit: 10,
          padding: 10,
          callback: (val) => {
            if (isHourlyGainsGraph || isLast7Days) {
              return DateTime.fromJSDate(new Date(val))
                .setZone("America/New_York")
                .toLocaleString({
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                });
            } else {
              return DateTime.fromJSDate(new Date(val))
                .setZone("America/New_York")
                .toLocaleString({
                  month: "short",
                  day: "numeric",
                });
            }
          },
        },
        grid: { color: "#e0e0e0" },
      },
    },
    elements: {
      line: !isLast7Days
        ? {
            borderWidth: 4,
            tension: 0.3,
            borderColor: "#2DD4FF",
            backgroundColor: "rgba(45, 212, 255, 0.2)",
            fill: true,
          }
        : undefined,
      point: {
        radius: 0,
        hoverRadius: 7,
        hoverBorderWidth: 3,
      },
    },
  },
  plugins: [backgroundColorPlugin, roundedCornersPlugin],
});
