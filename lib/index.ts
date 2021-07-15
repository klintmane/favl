import type { Elem, Fiber, Props } from "./types";

// STATE

export const Fragment = null; // disable fragments
let nextUnitOfWork: Fiber = null;
let currentRoot: Fiber = null;
let wipRoot: Fiber = null;
let deletions: Fiber[] = null;
let wipFiber: Fiber = null;
let hookIndex = null;

// UTILS

const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b); // bugged - JSON.stringify does not ensure order!

// e.(set|remove)Attribute fix issues with svg elements, while the latter works with text nodes
const setProp = (e: HTMLElement, n: string, v: any) => (e.setAttribute ? e.setAttribute(n, v) : (e[n] = v));
const removeProp = (e: HTMLElement, n: string) => (e.removeAttribute ? e.removeAttribute(n) : (e[n] = ""));

const isEvent = (p: string) => p.startsWith("on");
const isProp = (p: string) => p !== "children" && !isEvent(p);
const isNew = (prev: Props, next: Props, p: string) => prev[p] !== next[p];
const isGone = (next: Props, p: string) => !(p in next);

const toAddProp = (prev: Props, next: Props, n: string) => isProp(n) && isNew(prev, next, n);
const toDelProp = (prev: Props, next: Props, n: string) => isProp(n) && isGone(next, n);

const toAddEvent = (prev: Props, next: Props, n: string) => isEvent(n) && isNew(prev, next, n);
const toDelEvent = (prev: Props, next: Props, n: string) => isEvent(n) && (isGone(next, n) || isNew(prev, next, n));

// LIB

const createTextFiber = (txt: string): Fiber => ({
  type: "TEXT_ELEMENT",
  props: { nodeValue: txt, children: [] },
});

const createFiber = (type: Elem, p?: Props, ...ch): Fiber => ({
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
  //@ts-ignore
  window.cancelIdleCallback(workLoop);
  nextUnitOfWork = null;
  currentRoot = null;
  wipRoot = null;
  deletions = null;
};

const createDOM = (fiber: Fiber): HTMLElement => {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : fiber.type === "svg" // store this in a variable - so children can check this too (otherwise svg elements won't render)
      ? document.createElementNS("http://www.w3.org/2000/svg", fiber.type)
      : document.createElement(fiber.type);

  updateDOM(dom, { children: [] }, fiber.props);
  return dom;
};

const updateDOM = (dom: HTMLElement, prev: Props, next: Props) => {
  for (const p in prev) {
    toDelEvent(prev, next, p)
      ? dom.removeEventListener(p.toLowerCase().substring(2), prev[p])
      : toDelProp(prev, next, p) && removeProp(dom, p);
  }

  for (const p in next) {
    toAddProp(prev, next, p)
      ? setProp(dom, p, next[p])
      : toAddEvent(prev, next, p) && dom.addEventListener(p.toLowerCase().substring(2), next[p]);
  }
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
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDOM(fiber.dom, fiber.alternate.props, fiber.props);

    // In here we need to append or insertBefore depending on keys - we need a keyed implementation: https://github.com/pomber/didact/issues/9
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
    return;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
};

const commitDeletion = (fiber, domParent) => {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
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

  //@ts-ignore
  window.requestIdleCallback(workLoop);
};

//@ts-ignore
window.requestIdleCallback(workLoop);

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
    fiber.dom = createDOM(fiber);
  }
  reconcileChildren(fiber, fiber.props?.children);
};

const reconcileChildren = (wipFiber, elements = []) => {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];

    let newFiber = null;
    const sameType = oldFiber && element && element.type == oldFiber.type;

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        altername: null,
        effectTag: "PLACEMENT",
      };
    }

    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
};

// Hooks

export const useState = <T>(initial: T): [T, (action: T | ((prevState: T) => T)) => void] => {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
  const hook = { state: oldHook ? oldHook.state : initial, queue: [] };

  // Apply the queued setState actions
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = typeof action === "function" ? action(hook.state) : action;
  });

  const setState = (action) => {
    hook.queue.push(action);
    wipRoot = { dom: currentRoot && currentRoot.dom, props: currentRoot && currentRoot.props, alternate: currentRoot };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;

  return [hook.state, setState];
};

export const useEffect = (cb: () => void, deps: any[]) => {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];

  const hook = { deps };

  if (!oldHook) {
    // invoke callback if this is the first time
    cb();
  } else {
    if (!isEqual(oldHook.deps, hook.deps)) {
      cb();
    }
  }

  wipFiber.hooks.push(hook);
  hookIndex++;
};

export const useCallback = <T>(cb: T, deps: any[]): T => {
  return useMemo(() => cb, deps);
};

export const useMemo = <T>(compute: () => T, deps: any[]): T => {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
  const hook = { value: null, deps };

  if (oldHook) {
    if (isEqual(oldHook.deps, hook.deps)) {
      hook.value = oldHook.value;
    } else {
      hook.value = compute();
    }
  } else {
    hook.value = compute();
  }

  wipFiber.hooks.push(hook);
  hookIndex++;

  return hook.value;
};

export const useRef = <T>(initial: T): { current: T } => {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
  const hook = { value: oldHook ? oldHook.value : { current: initial } };

  wipFiber.hooks.push(hook);
  hookIndex++;

  return hook.value;
};
