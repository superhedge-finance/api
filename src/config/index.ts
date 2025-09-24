import { readFileSync } from "fs";
import { envs } from "./envs/index";
import loggerConfig from "./logger/index";
const pkg = JSON.parse(readFileSync("./package.json", { encoding: "utf8" }));

export const config: Partial<TsED.Configuration> = {
  version: pkg.version,
  envs,
  logger: loggerConfig,
  // Disable GraphQL/Apollo on Vercel for now to avoid platform mismatch
  // If needed later, migrate to a compatible setup or REST-only
  // additional shared configuration
};
