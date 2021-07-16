import { h, render, useState } from "../lib";
import Stress from "./stress";

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount((c) => c - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
};

const App = () => {
  const [test, setTest] = useState(0);

  return true ? (
    <Stress />
  ) : (
    <div>
      <Counter />
      <Counter />
    </div>
  );
};

render(<App />, document.getElementById("app"));
