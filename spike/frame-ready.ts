export interface RenderStatus {
  assetsReady: boolean;
  deckPasses: number;
  error?: string;
}
export interface FrameDriver {
  subscribe: (listener: () => void) => () => void;
  status: () => RenderStatus;
  update: () => void;
  repaint: () => void;
}

// Each accepted map pass must observe a NEW deck pass. All listeners belong to this call.
export function awaitFrame(driver: FrameDriver, frame: number, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    let passes = 0;
    let lastDeckPass = 0;
    const finish = (error?: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      unsubscribe();
      if (error) reject(error); else resolve();
    };
    const onRender = () => {
      if (finished) return;
      try {
        const status = driver.status();
        if (status.error) throw new Error(status.error);
        if (!status.assetsReady) passes = 0;
        else if (status.deckPasses > lastDeckPass) passes++;
        lastDeckPass = status.deckPasses;
        if (passes >= 2) finish(); else driver.repaint();
      } catch (error) { finish(error); }
    };
    try {
      const initial = driver.status();
      if (initial.error) throw new Error(initial.error);
      lastDeckPass = initial.deckPasses;
      unsubscribe = driver.subscribe(onRender);
      timer = setTimeout(() => finish(new Error(`FRAME_READY_TIMEOUT:${frame}`)), timeoutMs);
      driver.update();
      driver.repaint();
    } catch (error) { finish(error); }
  });
}

export async function withDeadline<T>(promise: Promise<T>, timeoutMs: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(code)), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}
