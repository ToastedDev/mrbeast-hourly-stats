import { CronJob } from "cron";
import { updateTask } from "./update";

const cron = new CronJob(
  "*/5 * * * * *",
  updateTask,
  null,
  true,
  "America/New_York",
);
cron.start();

console.log("Cron job has started.");
