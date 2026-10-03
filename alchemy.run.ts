import { Stack } from "alchemy";
import { providers, state, Worker } from "alchemy/Cloudflare";
import { gen } from "effect/Effect";

const workerProps = (stage: string) => {
  const base = {
    compatibility: {
      date: "2026-10-03",
      flags: ["nodejs_compat"],
    },
    main: "./src/worker.ts",
    name: stage === "prod" ? "agent-directory" : `agent-directory-${stage}`,
    workersDev: true,
  };

  return stage === "prod"
    ? { ...base, domain: "agents.mynameistito.com" }
    : base;
};

const resolveStackValue = Stack.useSync.bind(Stack);
const AgentDirectory = Worker(
  "AgentDirectory",
  resolveStackValue((stack) => workerProps(stack.stage))
);

export default Stack(
  "AgentDirectory",
  { providers: providers(), state: state() },
  gen(function* createStack() {
    const worker = yield* AgentDirectory;
    return { url: worker.url };
  })
);
