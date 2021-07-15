export interface Props<T = {}> {
  nodeValue?: string;
  children: Fiber<T>[];
}

export type Fiber<T = {}> = {
  dom?: T;
  hooks?: any[];
  parent?: Fiber<T>;
  child?: Fiber<T>;
  sibling?: Fiber<T>;
  alternate?: Fiber<T>;
  type?: string;
  effectTag?: "PLACEMENT" | "UPDATE" | "DELETION";
  props: Props<T>;
};
