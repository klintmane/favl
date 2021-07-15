export type Elem = any;

export interface Props {
  nodeValue?: string;
  children: Fiber[];
}

export interface Fiber {
  dom?: HTMLElement;
  hooks?: any[];
  parent?: Fiber;
  child?: Fiber;
  sibling?: Fiber;
  alternate?: Fiber;
  type?: Elem;
  effectTag?: "PLACEMENT" | "UPDATE" | "DELETION";
  props: Props;
}
