import { useState, h, useEffect, useCallback, useRef } from "../lib";
import styles from "./demo.module.css";

const COUNT = 100;
const LOOPS = COUNT * 0.05;

const initialState = { tick: 0, pos: { x: 0, y: 0 }, big: false };

export default () => {
  const [state, setState] = useState(initialState);
  // const [big, setBig] = useState(false);
  const { tick, pos, big } = state;

  // const setState = (v) => _setState((s) => ({ ...s, ...v }));

  // Infinite animation loop
  useEffect(() => {
    const a = setTimeout(() => setState((s) => ({ ...s, tick: tick + 1 })));
    return () => clearTimeout(a);
    // setState((s) => ({ ...s, tick: tick + 1 }));
  }, [tick, setState]);

  // setState({ tick: Math.random() });

  // Mouse behaviour
  useEffect(() => {
    const move = (e) => setState((s) => ({ ...s, pos: { x: e.pageX, y: e.pageY } }));
    const grow = (e) => setState((s) => ({ ...s, big: true }));
    const shrink = () => setState((s) => ({ ...s, big: false }));

    addEventListener("pointermove", move);
    addEventListener("pointerdown", grow);
    addEventListener("pointerup", shrink);

    return () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", grow);
      removeEventListener("pointerup", shrink);
    };
  }, [setState]); // setState is not stable

  const max = COUNT + Math.round(Math.sin((tick / 90) * 2 * Math.PI) * COUNT * 0.5);

  return (
    <div class={styles.container}>
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

  return (
    <span
      style={`left: ${x}px; top: ${y}px; width: ${w}px; height: ${w}px; border-color: ${color}`}
      fill="transparent"
    />
  );
};
