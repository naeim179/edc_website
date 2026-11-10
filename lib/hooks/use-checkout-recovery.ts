"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inspectCheckoutPayment, type CheckoutRecovery } from "@/app/actions/checkout-recovery";

type RecoveryState = CheckoutRecovery | { state: "checking" | "error" };

export function useCheckoutRecovery(courseId: string) {
  const [result, setResult] = useState<RecoveryState>({ state: "checking" });
  const mounted = useRef(false);
  const checking = useRef(false);
  const watched = useRef<string | undefined>(undefined);
  const polling = useRef(false);
  const generation = useRef(0);

  const check = useCallback(async () => {
    if (checking.current || !mounted.current || document.hidden) return;
    checking.current = true;
    const requestGeneration = generation.current;
    try {
      const next = await inspectCheckoutPayment(courseId, watched.current);
      if (!mounted.current || requestGeneration !== generation.current) return;
      if (next.orderId) watched.current = next.orderId;
      polling.current = next.state === "pending";
      setResult(next);
    } catch {
      if (mounted.current && requestGeneration === generation.current) {
        polling.current = true;
        setResult({ state: "error" });
      }
    } finally {
      checking.current = false;
    }
  }, [courseId]);

  const watch = useCallback((orderId?: string) => {
    generation.current += 1;
    if (orderId) watched.current = orderId;
    polling.current = true;
    setResult({ state: "pending", orderId });
    void check();
  }, [check]);

  useEffect(() => {
    mounted.current = true;
    void check();
    const onReturn = () => { void check(); };
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    const timer = window.setInterval(() => { if (polling.current) void check(); }, 30_000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [check]);

  return { recovery: result, check, watch };
}
