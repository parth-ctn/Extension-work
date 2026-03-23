export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollWithBackoff({
  task,
  handleResult,
  onProgress,
  onError,
  initialDelay,
  maxDelay,
  maxAttempts,
  backoffFactor = 1.5,
  signal,
  isActive = () => true,
}) {
  if (typeof task !== "function") {
    throw new Error("pollWithBackoff requires a task function");
  }
  if (typeof handleResult !== "function") {
    throw new Error("pollWithBackoff requires a handleResult function");
  }

  let delayMs = initialDelay;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted || !isActive()) {
      throw new Error("cancelled");
    }

    try {
      const result = await task();
      const outcome = handleResult(result, attempt) || {};

      if (outcome.progress !== undefined && onProgress) {
        onProgress(outcome.progress, attempt);
      }

      if (outcome.done) {
        return outcome.value ?? outcome.progress ?? null;
      }
    } catch (error) {
      if (signal?.aborted || !isActive()) {
        throw new Error("cancelled");
      }

      let shouldContinue;
      if (onError) {
        const decision = onError(error, attempt);
        shouldContinue = decision === undefined ? attempt < maxAttempts - 1 : Boolean(decision);
      } else {
        shouldContinue = attempt < maxAttempts - 1;
      }

      if (!shouldContinue) {
        throw error;
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
      delayMs = Math.min(Math.ceil(delayMs * backoffFactor), maxDelay);
    }
  }

  throw new Error("polling-timeout");
}
