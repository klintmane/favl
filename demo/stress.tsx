import { useState, h, useEffect } from "../lib";
import styles from "./demo.module.css";

const COUNT = 500;
const LOOPS = COUNT * 0.05;

const initialState = { tick: 0, pos: { x: 0, y: 0 }, big: false };

export default () => {
  const [state, _setState] = useState(initialState);
  const { tick, pos, big } = state;
  const setState = (v) => requestAnimationFrame(() => _setState({ ...state, ...v }));

  // Infinite animation loop
  useEffect(() => {
    setState({ tick: tick + 1 });
  }, [tick]);

  console.log("test", state);

  // Mouse behaviour
  useEffect(() => {
    addEventListener("pointermove", (e) => setState({ pos: { x: e.pageX, y: e.pageY } }));
    addEventListener("pointerdown", (e) => setState({ big: true }));
    addEventListener("pointerup", (e) => setState({ big: false }));
  }, []);

  const max = COUNT + Math.round(Math.sin((tick / 90) * 2 * Math.PI) * COUNT * 0.5);

  return (
    <div className={styles.container}>
      <Cursor label x={pos.x} y={pos.y} big={big} />
      {Array.from({ length: max }, (_, i) => {
        const f = (i / max) * LOOPS;
        const θ = f * 2 * Math.PI;
        const m = 20 + i * 2;
        const hue = (f * 255 + tick * 10) % 255;

        return (
          <Cursor
            big={big}
            color={"hsl(" + hue + ",100%,50%)"}
            x={(pos.x + Math.sin(θ) * m) | 0}
            y={(pos.y + Math.cos(θ) * m) | 0}
          />
        );
      })}
    </div>
  );
};

const Cursor = (props) => {
  const { x, y, color, big } = props;
  const w = big ? 20 : 8;
  console.log("x");

  return <span style={`left: ${x}; top: ${y}; width: ${w}; height: ${w}; border-color: ${color}`} fill="transparent" />;
};
