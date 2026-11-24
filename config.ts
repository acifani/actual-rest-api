export interface ActualConfig {
  serverURL: string;
  password: string;
  syncID: string;
}

export interface Config {
  port: number | string;
  syncIntervalMs: number;
  authToken?: string;
  actual: ActualConfig;
}

export function loadConfig(env = process.env): Config {
  const { ACTUAL_SERVER_URL: serverURL, ACTUAL_PASSWORD: password, ACTUAL_BUDGET_SYNC_ID: syncID } = env;
  if (!serverURL || !password || !syncID) {
    throw new Error('ACTUAL_SERVER_URL, ACTUAL_PASSWORD and ACTUAL_BUDGET_SYNC_ID must be set');
  }
  return {
    port: env.PORT || 3000,
    syncIntervalMs: (Number(env.ACTUAL_REFRESH_INTERVAL_SECONDS) || 60) * 1000,
    authToken: env.AUTH_TOKEN || undefined,
    actual: { serverURL, password, syncID },
  };
}
