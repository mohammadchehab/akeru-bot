export const MAX_STREAMS_PER_SESSION = 64;

export const STREAM_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export const BYTES_PER_SECOND = 5 * 1024 * 1024;

/**
 * Token bucket shared by every stream of one session. `take` returns how many milliseconds the
 * caller must wait before moving `bytes`; time is passed in so tests need no clock.
 */
export const makeTokenBucket = (bytesPerSecond: number, startMs: number) => {
  let tokens = bytesPerSecond;
  let last = startMs;

  return {
    take: (bytes: number, nowMs: number): number => {
      tokens = Math.min(bytesPerSecond, tokens + ((nowMs - last) / 1000) * bytesPerSecond);
      last = nowMs;
      tokens -= bytes;

      return tokens >= 0 ? 0 : Math.ceil((-tokens / bytesPerSecond) * 1000);
    },
  };
};

/** Counts live streams against the per-session cap. */
export const createStreamCounter = (max: number) => {
  let live = 0;

  return {
    tryAcquire: (): boolean => {
      if (live >= max) return false;
      live += 1;

      return true;
    },
    release: (): void => {
      live = Math.max(0, live - 1);
    },
    live: () => live,
  };
};
