import { createApi, runScheduler } from "./api/http";
import type { Env } from "./env";
import { GenerateBookWorkflow } from "../workflows/generate-book";
import { BuildWorldWorkflow } from "../workflows/build-world";

const api = createApi();

export { BuildWorldWorkflow, GenerateBookWorkflow };

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return api.fetch(request, env, ctx);
  },
  async scheduled(_controller: ScheduledController, env: Env) {
    await runScheduler(env);
  }
};
