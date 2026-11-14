export interface HealthStatus {
  status: "ok";
  /** Server time as an ISO 8601 string in UTC. */
  time: string;
}

export function healthStatus(now: Date = new Date()): HealthStatus {
  return { status: "ok", time: now.toISOString() };
}
