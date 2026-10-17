"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Pause completion until submit/skip; cancellation never generates a report after unmount. */
export function useFeedbackStep() {
  const [visible, setVisible] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const finished = useRef(false);
  const mounted = useRef(true);
  const pending = useRef<((continueFlow: boolean) => void) | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.(false);
      pending.current = null;
    };
  }, []);

  const request = useCallback(() => {
    if (!mounted.current) return Promise.resolve(false);
    if (finished.current) return Promise.resolve(true);
    return new Promise<boolean>(resolve => {
      pending.current = resolve;
      setSubmissionId(current => current || crypto.randomUUID());
      setVisible(true);
    });
  }, []);

  const complete = useCallback(() => {
    finished.current = true;
    setVisible(false);
    const resolve = pending.current;
    pending.current = null;
    resolve?.(true);
  }, []);

  return { visible, submissionId, request, complete };
}
