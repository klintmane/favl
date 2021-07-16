import type { Fiber, Props } from "./types";
import reconciler from "./dom";
export * from "./hooks";

// @ts-ignore
const scheduler = (x) => window.requestIdleCallback(x, { timeout: 50 });
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

export const getHook = (v) => {
  const old = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex++];
  const curr = typeof v == "function" ? v(old) : v;
  wipFiber.hooks.push(curr);
  return [curr, old];
};

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

// if element specified renders it into container (root render) otherwise performs a currenRoot re-render
export const render = (f?: Fiber, container = currentRoot.dom) => {
  wipRoot = { dom: container, props: f ? { children: [f] } : currentRoot.props, alternate: currentRoot };
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

const commitWork = (f: Fiber) => {
  if (!f) return;

  let domParentFiber = f.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (f.effectTag === "PLACEMENT" && f.dom != null) {
    reconciler.insert(domParent, f.dom);
  } else if (f.effectTag === "UPDATE" && f.dom != null) {
    reconciler.update(f.dom, f.alternate.props, f.props);
    // In here we need to append or insertBefore depending on keys - we need a keyed implementation: https://github.com/pomber/didact/issues/9
  } else if (f.effectTag === "DELETION") {
    commitDeletion(f, domParent);
    return;
  }

  commitWork(f.child);
  commitWork(f.sibling);
};

const commitDeletion = (f: Fiber, container) => {
  if (f.dom) {
    reconciler.remove(container, f.dom);
  } else {
    commitDeletion(f.child, container);
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

const performUnitOfWork = (f: Fiber) => {
  const isFunctionComponent = f.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(f);
  } else {
    updateHostComponent(f);
  }

  if (f.child) {
    return f.child;
  }

  let nextFiber = f;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
};

const updateFunctionComponent = (f: Fiber) => {
  wipFiber = f;
  hookIndex = 0;
  wipFiber.hooks = [];
  reconcileChildren(f, [f.type(f.props)]);
};

const updateHostComponent = (f: Fiber) => {
  !f.dom && (f.dom = reconciler.create(f.type, f.props));
  reconcileChildren(f, f.props?.children);
};

const reconcileChildren = (wip: Fiber, elements = []) => {
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
