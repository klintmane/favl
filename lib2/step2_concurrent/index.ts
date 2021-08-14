import type { Elem, Props, Type } from "./types";

const isProp = (p: string) => p !== "children";

const createElem = (type: Type, p: Props, ...ch: Elem[]): Elem => ({
  type,
  props: { ...p, children: ch.map((c) => (c.constructor === Object ? c : { value: c })) },
});

const render = (el: Elem, domEl) => {
  let dom: HTMLElement | Text;

  if ("type" in el) {
    dom = document.createElement(el.type);
    for (const name in el.props) {
      isProp(name) && (dom[name] = el.props[name]);
    }
    for (const ch of el.props.children) {
      render(ch, dom);
    }
  } else {
    dom = document.createTextNode(el.value);
  }

  domEl.appendChild(domEl);
};

export { createElem as h, render };
