import { defineQueue } from "void";
import { asBindings } from "../src/bindings";
import { failPageSpeedStrategy, runPageSpeedStrategy, type PageSpeedMessage } from "../src/pagespeed/jobs";

export const maxBatchSize = 1;
export const maxRetries = 3;
export const retryDelay = 30;

export default defineQueue<PageSpeedMessage>(async (batch, env) => {
  for (const msg of batch.messages) {
    try {
      await runPageSpeedStrategy(asBindings(env), msg.body);
      msg.ack();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (msg.attempts >= maxRetries) {
        await failPageSpeedStrategy(asBindings(env), msg.body, message);
        msg.ack();
      } else {
        msg.retry({ delaySeconds: retryDelay });
      }
    }
  }
});
