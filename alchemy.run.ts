import { Stack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import { DNS, providers, state, Worker, Zone } from "alchemy/Cloudflare";
import { gen } from "effect/Effect";

const directoryTarget = "agents.mynameistito.com.";
const directorySvcbValue = 'alpn="h2,http/1.1" port="443"';

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
    const stack = yield* Stack;

    if (stack.stage === "prod") {
      const zone = yield* Zone.Zone("AgentDirectoryZone", {
        name: "mynameistito.com",
      }).pipe(adopt(true));

      yield* DNS.Dnssec("AgentDirectoryDnssec", {
        status: "active",
        zoneId: zone.zoneId,
      }).pipe(adopt(true));

      yield* DNS.Record("OrganizationIndexDnsAid", {
        comment: "DNS-AID organization index pointer",
        content: {
          priority: 1,
          target: directoryTarget,
          value: directorySvcbValue,
        },
        name: "_index._agents.mynameistito.com",
        ttl: 3600,
        type: "SVCB",
        zoneId: zone.zoneId,
      }).pipe(adopt(true));

      yield* DNS.Record("ServiceHostnameIndexDnsAid", {
        comment: "DNS-AID index pointer for agents.mynameistito.com",
        content: {
          priority: 1,
          target: directoryTarget,
          value: directorySvcbValue,
        },
        name: "_index._agents.agents.mynameistito.com",
        ttl: 3600,
        type: "SVCB",
        zoneId: zone.zoneId,
      }).pipe(adopt(true));

      yield* DNS.Record("HamiltonBinDayIndexDnsAid", {
        comment: "DNS-AID index pointer for bin-day.mynameistito.com",
        content: {
          priority: 1,
          target: directoryTarget,
          value: directorySvcbValue,
        },
        name: "_index._agents.bin-day.mynameistito.com",
        ttl: 3600,
        type: "SVCB",
        zoneId: zone.zoneId,
      }).pipe(adopt(true));
    }

    return { url: worker.url };
  })
);
