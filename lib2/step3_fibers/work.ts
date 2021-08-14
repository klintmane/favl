import { Fiber } from "./types";

const schedule = window["requestIdleCallback"];

let nextJob: Fiber;

export const scheduleJob = (job: Fiber) => (nextJob = job);

const runJob = (job: Fiber) => {
  // TODO add dom node
  // TODO create new fibers
  // TODO return next unit of work
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
