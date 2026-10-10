/** Endpoints not tied to a feature: service health. */

import { request } from "@/services/api";
import type { HealthStatus } from "@/types/api";

/** `degraded` = Redis is down (exports and emails paused); `worker: "down"` = no export / email worker running. */
export function getHealth(): Promise<HealthStatus> {
  return request("/health");
}
