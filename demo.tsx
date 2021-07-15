import { h, render, useState } from "./lib";

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count - 1)}>-</button>
      <span>Test {count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
};

render(<App />, document.getElementById("app"));
