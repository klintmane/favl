import type { Props } from "./types";
import { createRenderer } from ".";

export type Elem = HTMLElement | Text | SVGSVGElement;

// e.(set|remove)Attribute fix issues with svg elements, while the latter works with text nodes
const setProp = (e: Elem, n: string, v: any) => ("setAttribute" in e ? e.setAttribute(n, v) : (e[n] = v));
const removeProp = (e: Elem, n: string) => ("removeAttribute" in e ? e.removeAttribute(n) : (e[n] = ""));

const eventName = (n: string) => n.toLowerCase().substring(2);

const isEvent = (p: string) => p.startsWith("on");
const isProp = (p: string) => p !== "children" && !isEvent(p);
const propChanged = (prev: Props, next: Props, p: string) => prev[p] !== next[p];
const propRemoved = (next: Props, p: string) => !(p in next);

export const render = createRenderer<Elem>({
  update: (dom, prev, next) => {
    for (const p in prev) {
      isEvent(p) && (propRemoved(next, p) || propChanged(prev, next, p)) // conditionally remove listener
        ? dom.removeEventListener(eventName(p), prev[p])
        : isProp(p) && propRemoved(next, p) && removeProp(dom, p); // conditionally remove old prop
    }
    for (const p in next) {
      isProp(p) && propChanged(prev, next, p) // conditionally add new prop
        ? setProp(dom, p, next[p])
        : isEvent(p) && propChanged(prev, next, p) && dom.addEventListener(eventName(p), next[p]); // conditionally add listener
    }
  },
  create: (type, props) =>
    type === "TEXT"
      ? document.createTextNode("")
      : type === "svg" // store this in a variable - so children can check this too (otherwise svg elements won't render)
      ? document.createElementNS("http://www.w3.org/2000/svg", type)
      : document.createElement(type),
  insert: (parent, el) => parent.appendChild(el),
  remove: (parent, el) => parent.removeChild(el),
});
