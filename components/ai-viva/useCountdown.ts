import { useEffect, useReducer } from "react";

type CountdownState = {
  secondsLeft: number;
};

type CountdownAction =
  | { type: "reset"; value: number }
  | { type: "tick" };

function countdownReducer(state: CountdownState, action: CountdownAction): CountdownState {
  switch (action.type) {
    case "reset":
      return { secondsLeft: action.value };
    case "tick":
      return { secondsLeft: Math.max(0, state.secondsLeft - 1) };
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

  useEffect(() => {
    dispatch({ type: "reset", value: initialSeconds });
  }, [initialSeconds, resetKey]);

  useEffect(() => {
    if (!running) return;
    if (state.secondsLeft <= 0) return;

    const id = window.setInterval(() => {
      if (state.secondsLeft <= 1) {
        window.clearInterval(id);
        if (onComplete) {
          onComplete();
        }
        dispatch({ type: "reset", value: 0 });
        return;
      }

      dispatch({ type: "tick" });
    }, 1000);

    return () => window.clearInterval(id);
  }, [running, state.secondsLeft, onComplete]);

  const minutes = Math.floor(state.secondsLeft / 60);
  const seconds = state.secondsLeft % 60;

  return { secondsLeft: state.secondsLeft, minutes, seconds };
}

