import { defineScheduled } from "void";
import { asBindings } from "../src/bindings";
import { deleteOldRecords } from "../src/pagespeed/storage";

export const cron = "0 4 * * *";

export default defineScheduled(async (_controller, env) => {
  const result = await deleteOldRecords(asBindings(env), 10);
  console.log("Deleted old PageSpeed records", result.deletedCount);
});
