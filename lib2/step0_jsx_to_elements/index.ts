import type { Elem, Props, Type } from "./types";

const createElem = (type: Type, p: Props, ...ch: Elem[]): Elem => ({
  type,
  props: { ...p, children: ch.map((c) => (c.constructor === Object ? c : { value: c })) },
});

export { createElem as h };
