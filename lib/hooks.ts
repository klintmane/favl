import { getHook, render } from "./index";

const depsChanged = (a: any[], b: any[]) => !a || a.length !== b.length || b.some((arg, index) => arg !== a[index]);

export const useState = <T>(initial: T): [T, (action: T | ((prevState: T) => T)) => void] => {
  const [curr, old] = getHook((o) => ({ state: o?.state || initial, queue: [] }));

  (old?.queue || []).forEach((a) => (curr.state = typeof a === "function" ? a(curr.state) : a)); // apply queued values
  const setState = (action) => (curr.queue.push(action), render()); // push to queue and render

  return [curr.state, setState];
};

export const useEffect = (cb: () => void, deps: any[]) => {
  const [curr, old] = getHook(deps);
  if (!old || depsChanged(old, curr)) cb();
};

export const useMemo = <T>(compute: () => T, deps: any[]): T => {
  const [curr, old] = getHook({ value: null, deps });
  curr.value = !old || (old && depsChanged(old.deps, curr.deps)) ? compute() : old.value;
  return curr.value;
};

export const useCallback = <T>(cb: T, deps: any[]) => useMemo(() => cb, deps);
export const useRef = <T>(val: T) => getHook((o) => o || { current: val })[0] as { current: T };
