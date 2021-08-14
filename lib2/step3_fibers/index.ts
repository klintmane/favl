import type { Elem, Fiber, Props, Type } from "./types";
import { scheduleJob } from "./work";

const isProp = (p: string) => p !== "children";

const createElem = (type: Type, p: Props, ...ch: Elem[]): Elem => ({
  type,
  props: { ...p, children: ch.map((c) => (c.constructor === Object ? c : { value: c })) },
});

const createHost = (el: Fiber<Elem>) => {
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
};

const render = (el: Elem, domEl) => {
  scheduleJob({ host: domEl, props: { children: [el] } });
  // TODO set next unit of work
};

export { createElem as h, render };
