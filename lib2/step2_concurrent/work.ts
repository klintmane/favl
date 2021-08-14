const schedule = window["requestIdleCallback"];

let nextJob;

const runJob = (job) => {
  // TODO
};

const loop = (deadline) => {
  let pause = false;
  while (nextJob && !pause) {
    nextJob = runJob(nextJob);
    pause = deadline.timeRemaining() < 1;
  }
  schedule(loop);
};
schedule(loop);
