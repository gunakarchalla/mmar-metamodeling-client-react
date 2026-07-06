import { useLogStore } from "@/resources/store/logStore";

/**
 * Thin shim replacing the Aurelia `Logger` service. The engine ports keep their
 * `this.logger.log(value, status)` calls working by being constructed with this
 * object. It simply forwards to the logStore (which prepends to logArray and
 * raises a snackbar on errors).
 */
export const logger = {
  log: (value: string, status: string): void => useLogStore.getState().log(value, status),
};

export type Logger = typeof logger;
