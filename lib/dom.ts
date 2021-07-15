import type { Props } from "./types";

type Element = HTMLElement | Text | SVGSVGElement;

// e.(set|remove)Attribute fix issues with svg elements, while the latter works with text nodes
const setProp = (e: Element, n: string, v: any) => ("setAttribute" in e ? e.setAttribute(n, v) : (e[n] = v));
const removeProp = (e: Element, n: string) => ("removeAttribute" in e ? e.removeAttribute(n) : (e[n] = ""));

const isEvent = (p: string) => p.startsWith("on");
const isProp = (p: string) => p !== "children" && !isEvent(p);
const isNew = (prev: Props, next: Props, p: string) => prev[p] !== next[p];
const isGone = (next: Props, p: string) => !(p in next);

const update = (dom: Element, prev: Props, next: Props) => {
  for (const p in prev) {
    isEvent(p) && (isGone(next, p) || isNew(prev, next, p)) // conditionally remove listener
      ? dom.removeEventListener(p.toLowerCase().substring(2), prev[p])
      : isProp(p) && isGone(next, p) && removeProp(dom, p); // conditionally remove old prop
  }

  for (const p in next) {
    isProp(p) && isNew(prev, next, p) // conditionally add new prop
      ? setProp(dom, p, next[p])
      : isEvent(p) && isNew(prev, next, p) && dom.addEventListener(p.toLowerCase().substring(2), next[p]); // conditionally add listener
  }
};

const create = (type: string, props: Props) => {
  const dom =
    type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : type === "svg" // store this in a variable - so children can check this too (otherwise svg elements won't render)
      ? document.createElementNS("http://www.w3.org/2000/svg", type)
      : document.createElement(type);

  update(dom, { children: [] }, props);
  return dom;
};

const insert = (parent: Element, el: Element) => parent.appendChild(el);
const remove = (parent: Element, el: Element) => parent.removeChild(el);

export default { update, create, remove, insert };
