import { useEffect, useReducer, useRef } from "react";

type CountdownState = {
  secondsLeft: number;
};

type CountdownAction =
  | { type: "reset"; value: number }
  | { type: "set"; value: number };

function countdownReducer(state: CountdownState, action: CountdownAction): CountdownState {
  switch (action.type) {
    case "reset":
      return { secondsLeft: action.value };
    case "set":
      if (state.secondsLeft === action.value) {
        return state;
      }

      return { secondsLeft: action.value };
    default:
      return state;
  }
}

export function useCountdown(
  initialSeconds: number,
  running: boolean,
  onComplete?: () => void,
  resetKey?: string | number
) {
  const [state, dispatch] = useReducer(countdownReducer, {
    secondsLeft: initialSeconds,
  });
  const deadlineRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    dispatch({ type: "reset", value: initialSeconds });
    deadlineRef.current = null;
    completedRef.current = false;
  }, [initialSeconds, resetKey]);

  useEffect(() => {
    if (!running) {
      deadlineRef.current = null;
      return;
    }

    if (state.secondsLeft <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + state.secondsLeft * 1000;
    }

    const tick = () => {
      if (deadlineRef.current === null) {
        return;
      }

      const nextSeconds = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000)
      );

      dispatch({ type: "set", value: nextSeconds });

      if (nextSeconds <= 0 && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);

    return () => window.clearInterval(id);
  }, [running, state.secondsLeft, onComplete]);

  const minutes = Math.floor(state.secondsLeft / 60);
  const seconds = state.secondsLeft % 60;

  return { secondsLeft: state.secondsLeft, minutes, seconds };
}
