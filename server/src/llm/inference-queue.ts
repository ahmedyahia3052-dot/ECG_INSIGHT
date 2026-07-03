type QueueTask<T> = () => Promise<T>;

type QueueEntry<T> = {
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
  task: QueueTask<T>;
};

const maxConcurrent = Math.max(1, Number(process.env["LLM_MAX_CONCURRENT"] ?? 1));

class InferenceQueue {
  private active = 0;
  private readonly pending: QueueEntry<unknown>[] = [];

  run<T>(task: QueueTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({ reject, resolve, task: task as QueueTask<unknown> });
      this.pump();
    });
  }

  private pump() {
    while (this.active < maxConcurrent && this.pending.length > 0) {
      const entry = this.pending.shift();
      if (!entry) return;
      this.active += 1;
      void entry
        .task()
        .then(entry.resolve, entry.reject)
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }
}

export const llmInferenceQueue = new InferenceQueue();
