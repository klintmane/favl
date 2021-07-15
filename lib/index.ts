import type { Fiber, Props } from "./types";
import reconciler from "./dom";

// @ts-ignore
const scheduler = window.requestIdleCallback;
// @ts-ignore
scheduler.cancel = window.cancelIdleCallback;

// STATE

export const Fragment = null; // disable fragments
let nextUnitOfWork: Fiber = null;
let currentRoot: Fiber = null;
let wipRoot: Fiber = null;
let deletions: Fiber[] = null;
let wipFiber: Fiber = null;
let hookIndex = null;

// UTILS

const depsChanged = (a: any[], b: any[]) => !a || a.length !== b.length || b.some((arg, index) => arg !== a[index]);

// LIB

const createTextFiber = (txt: string): Fiber => ({
  type: "TEXT_ELEMENT",
  props: { nodeValue: txt, children: [] },
});

const createFiber = (type: string, p?: Props, ...ch): Fiber => ({
  type,
  props: { ...p, children: ch.flat().map((c) => (typeof c === "object" ? c : createTextFiber(c))) },
});
export const h = createFiber;

export const render = (element: Fiber, container) => {
  wipRoot = { dom: container, props: { children: [element] }, alternate: currentRoot };
  deletions = [];
  nextUnitOfWork = wipRoot;
};

const unmount = () => {
  scheduler.cancel(workLoop);
  nextUnitOfWork = null;
  currentRoot = null;
  wipRoot = null;
  deletions = null;
};

const commitRoot = () => {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
};

const commitWork = (fiber: Fiber) => {
  if (!fiber) return;

  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    reconciler.insert(domParent, fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    reconciler.update(fiber.dom, fiber.alternate.props, fiber.props);
    // In here we need to append or insertBefore depending on keys - we need a keyed implementation: https://github.com/pomber/didact/issues/9
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
    return;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
};

const commitDeletion = (fiber: Fiber, domParent) => {
  if (fiber.dom) {
    reconciler.remove(domParent, fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
};

const workLoop = (deadline) => {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  scheduler(workLoop);
};

scheduler(workLoop);

const performUnitOfWork = (fiber) => {
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
};

const updateFunctionComponent = (fiber) => {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
};

const updateHostComponent = (fiber) => {
  if (!fiber.dom) {
    fiber.dom = reconciler.create(fiber.type, fiber.props);
  }
  reconcileChildren(fiber, fiber.props?.children);
};

const reconcileChildren = (wip, elements = []) => {
  let index = 0;
  let old = wip.alternate && wip.alternate.child;
  let prevSibling = null;

  while (index < elements.length || old != null) {
    const el = elements[index];

    const sameType = old && el && el.type == old.type;
    const newFiber = sameType
      ? { type: old.type, props: el.props, dom: old.dom, parent: wip, alternate: old, effectTag: "UPDATE" }
      : el
      ? { type: el.type, props: el.props, dom: null, parent: wip, altername: null, effectTag: "PLACEMENT" }
      : null;

    if (old && !sameType) {
      old.effectTag = "DELETION";
      deletions.push(old);
    }

    if (old) {
      old = old.sibling;
    }

    if (index === 0) {
      wip.child = newFiber;
    } else if (el) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
};

// Hooks

const getHook = (v) => {
  const old = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex++];
  const curr = typeof v == "function" ? v(old) : v;
  wipFiber.hooks.push(curr);
  return [curr, old];
};

export const useState = <T>(initial: T): [T, (action: T | ((prevState: T) => T)) => void] => {
  const [curr, old] = getHook((o) => ({ state: o?.state || initial, queue: [] }));

  // Apply the queued setState actions
  const actions = old ? old.queue : [];
  actions.forEach((a) => (curr.state = typeof a === "function" ? a(curr.state) : a));

  const setState = (action) => {
    // console.log("state set to:", action);
    curr.queue.push(action);
    wipRoot = { dom: currentRoot && currentRoot.dom, props: currentRoot && currentRoot.props, alternate: currentRoot };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

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
