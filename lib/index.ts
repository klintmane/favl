import type { Fiber, Props, Renderer } from "./types";
export * from "./hooks";

// @ts-ignore
const scheduler = window.requestIdleCallback;
// @ts-ignore
scheduler.cancel = window.cancelIdleCallback;

// STATE

export const Fragment = null;
let nextUnitOfWork: Fiber = null;
let currentRoot: Fiber = null;
let wipRoot: Fiber = null;
let deletions: Fiber[] = null;
let wipFiber: Fiber = null;

let hookIndex = null;
let renderer = null;

export const createRenderer = <T>(def: Renderer<T>) => (
  (renderer = def), (...args) => (scheduler(loop), render(...args))
);

export const getHook = (v) => {
  const old = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex++];
  const curr = typeof v == "function" ? v(old) : v;
  wipFiber.hooks.push(curr);
  return [curr, old];
};

// LIB

const createTextFiber = (txt: string): Fiber => ({ type: "TEXT", props: { nodeValue: txt, children: [] } });

const createFiber = (type: string, p?: Props, ...ch): Fiber => ({
  type,
  props: { ...p, children: ch.flat().map((c) => (typeof c === "object" ? c : createTextFiber(c))) },
});
export const h = createFiber;

// if element specified renders it into container (root render) otherwise performs a currenRoot re-render
export const render = (f?: Fiber, dom = currentRoot?.dom) => {
  wipRoot = dom ? { dom, props: f ? { children: [f] } : currentRoot?.props, alternate: currentRoot } : wipRoot;
  console.log(currentRoot, wipRoot);
  nextUnitOfWork = wipRoot;
  deletions = [];
};

const commitRoot = () => {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
};

const commitWork = (f: Fiber) => {
  if (!f) return;

  let target = f.parent; // Get closes target dom element
  while (!target.dom) {
    target = target.parent;
  }

  const dom = target.dom;

  f.dom && f.effect == "INSERT" && renderer.insert(dom, f.dom);
  f.dom && f.effect == "UPDATE" && renderer.update(f.dom, f.alternate.props, f.props); // In here we need to append or insertBefore depending on keys - we need a keyed implementation: https://github.com/pomber/didact/issues/9
  f.effect == "DELETE" ? commitDeletion(f, dom) : (commitWork(f.child), commitWork(f.sibling));
};

const commitDeletion = (f: Fiber, container) =>
  f.dom ? renderer.remove(container, f.dom) : commitDeletion(f.child, container);

const loop = (deadline) => {
  let shouldYield = false;
  while (nextUnitOfWork && renderer && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  !nextUnitOfWork && wipRoot && commitRoot();
  scheduler(loop);
};

const performUnitOfWork = (f: Fiber) => {
  const isFunctionComponent = f.type instanceof Function;
  isFunctionComponent ? updateFunctionComponent(f) : updateHostComponent(f);

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
  !f.dom && (f.dom = renderer.create(f.type, f.props));
  renderer.update(f.dom, { children: [] }, f.props);
  reconcileChildren(f, f.props?.children);
};

const reconcileChildren = (wip: Fiber, elements: Fiber[] = []) => {
  let prev = wip.alternate && wip.alternate.child;
  let prevSibling = null;

  for (let i = 0; i < elements.length || prev != null; i++) {
    const el = elements[i];

    const preserve = prev && el && el.type == prev.type; // preserve the element?
    const newFiber: Fiber = preserve
      ? { type: prev.type, props: el.props, dom: prev.dom, parent: wip, alternate: prev, effect: "UPDATE" }
      : el
      ? { type: el.type, props: el.props, dom: null, parent: wip, alternate: null, effect: "INSERT" }
      : null;

    if (prev && !preserve) {
      prev.effect = "DELETE";
      deletions.push(prev);
    }

    prev && (prev = prev.sibling);
    !i ? (wip.child = newFiber) : el && (prevSibling.sibling = newFiber);

    prevSibling = newFiber;
  }
};
