import { CronJob } from "cron";
import { updateTask } from "./update";

const cron = new CronJob(
  "*/5 * * * * *",
  updateTask,
  null,
  true,
  "Africa/Abidjan",
);
cron.start();
