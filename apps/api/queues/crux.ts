import { defineQueue } from "void";
import { asBindings } from "../src/bindings";
import {
  failCruxMessage,
  isRetryableCruxError,
  runCruxMessage,
  type CruxMessage,
} from "../src/crux/jobs";

export const maxBatchSize = 1;
export const maxRetries = 3;
export const retryDelay = 20;

export default defineQueue<CruxMessage>(async (batch, env) => {
  for (const msg of batch.messages) {
    try {
      await runCruxMessage(asBindings(env), msg.body);
      msg.ack();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isRetryableCruxError(error) || msg.attempts >= maxRetries) {
        await failCruxMessage(asBindings(env), msg.body, message);
        msg.ack();
      } else {
        msg.retry({ delaySeconds: retryDelay });
      }
    }
  }
});
