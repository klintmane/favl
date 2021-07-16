import type { Elem } from "./dom";

export interface Props<T = Elem> {
  nodeValue?: string;
  children: Fiber<T>[];
}

export type Fiber<T = Elem> = {
  // vnode
  type?: any;
  props: Props<T>;

  // fiber
  dom?: T;
  hooks?: any[];
  parent?: Fiber<T>;
  child?: Fiber<T>;
  sibling?: Fiber<T>;
  alternate?: Fiber<T>;
  effect?: "INSERT" | "UPDATE" | "DELETE";
};
