import type { Elem } from "./dom";

export interface Props<T = Elem> {
  nodeValue?: string;
  children: Fiber<T>[];
}

export type Fiber<T = Elem> = {
  dom?: T;
  hooks?: any[];
  parent?: Fiber<T>;
  child?: Fiber<T>;
  sibling?: Fiber<T>;
  alternate?: Fiber<T>;
  type?: any;
  effect?: "INSERT" | "UPDATE" | "DELETE";
  props: Props<T>;
};
