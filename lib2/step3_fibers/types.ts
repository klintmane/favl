export type Type = any;
export type Props = { children: Elem[] };

export type Elem = { type: Type; props: Props } | { value: any }; // element or text node
export type Fiber<T = any> = { host: any } & T;
