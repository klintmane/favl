import { h, render, useState } from "../lib";
import Stress from "./stress";

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <Stress />
    </div>
  );
};

render(<App />, document.getElementById("app"));