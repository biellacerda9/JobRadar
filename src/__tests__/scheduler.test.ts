import { jest } from "@jest/globals";
import { startScheduler } from "../scraper/scheduler.js";

const INTERVAL = 60_000;

describe("startScheduler", () => {
  let stop: () => void = () => {};

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    stop();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("runs immediately and then once per interval", async () => {
    const task = jest.fn(async () => {});

    stop = startScheduler(task, INTERVAL);
    await jest.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(INTERVAL);
    expect(task).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(INTERVAL);
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("skips a tick while the previous run is still in progress", async () => {
    let finish: () => void = () => {};
    const task = jest.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );

    stop = startScheduler(task, INTERVAL);
    await jest.advanceTimersByTimeAsync(INTERVAL * 2);
    expect(task).toHaveBeenCalledTimes(1);

    finish();
    await jest.advanceTimersByTimeAsync(INTERVAL);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("keeps running after a failed run", async () => {
    const task = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Gupy down"))
      .mockResolvedValue(undefined);

    stop = startScheduler(task, INTERVAL);
    await jest.advanceTimersByTimeAsync(INTERVAL);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("stops when the returned function is called", async () => {
    const task = jest.fn(async () => {});

    stop = startScheduler(task, INTERVAL);
    await jest.advanceTimersByTimeAsync(0);
    stop();
    await jest.advanceTimersByTimeAsync(INTERVAL * 3);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
