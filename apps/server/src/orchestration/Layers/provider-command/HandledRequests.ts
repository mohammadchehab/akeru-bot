import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";

/**
 * Remembers which turn requests were already handled, so an event delivered twice starts one turn.
 * `claim` checks and marks a key in one synchronous step: two fibers claiming the same key can
 * never both see it as new, which a separate lookup followed by a write could not promise.
 */
export const createHandledRequests = (options: {
  readonly capacity: number;
  readonly timeToLive: Duration.Input;
}) => {
  const timeToLiveMillis = Duration.toMillis(Duration.fromInputUnsafe(options.timeToLive));

  // Oldest first: a Map iterates in insertion order and `claim` re-inserts every key it sees.
  const expiresAt = new Map<string, number>();

  /** True when the key was already claimed within the time to live; claims it otherwise. */
  const claim = (key: string) =>
    Effect.map(Clock.currentTimeMillis, (now) => {
      const previous = expiresAt.get(key);

      expiresAt.delete(key);
      expiresAt.set(key, now + timeToLiveMillis);

      while (expiresAt.size > options.capacity) {
        const oldest = expiresAt.keys().next();

        if (oldest.done) break;
        expiresAt.delete(oldest.value);
      }

      return previous !== undefined && previous > now;
    });

  return { claim };
};
