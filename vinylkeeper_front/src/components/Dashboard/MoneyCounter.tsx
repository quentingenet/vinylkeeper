import { useEffect, useRef, useState } from "react";
import { Box, keyframes } from "@mui/material";
import { formatMoney } from "@components/Dashboard/collectionValueLabels";
import type { Currency } from "@models/IDashboardStats";

const DURATION_MS = 1400;
// Share of the amount on screen before it rolls
const VISIBLE_THRESHOLD = 0.6;

// Read by screen readers, not shown
const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: "-1px",
  padding: 0,
  border: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

// The figures land on their amount: a short gold pulse
const jackpot = keyframes`
  0% { transform: scale(1); text-shadow: none; }
  40% { transform: scale(1.12); text-shadow: 0 0 12px currentColor; }
  100% { transform: scale(1); text-shadow: none; }
`;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface MoneyCounterProps {
  amount: number;
  currency: Currency;
}

/**
 * An amount that rolls to its value, then pulses, once it is on screen: from 0 when first seen,
 * then from the previous amount when it changes (a re-evaluation in progress, another currency). Screen readers get the final
 * amount; with reduced motion, it is shown at once without pulse.
 */
export default function MoneyCounter({ amount, currency }: MoneyCounterProps) {
  const [shown, setShown] = useState(0);
  const [pulses, setPulses] = useState(0);
  // Without IntersectionObserver (old browsers), the amount counts as seen
  const [inView, setInView] = useState(() => typeof window.IntersectionObserver !== "function");
  const shownRef = useRef(0);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || typeof window.IntersectionObserver !== "function") return;
    const observer = new window.IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: VISIBLE_THRESHOLD }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Out of sight: the roll waits for the user to scroll to it
    if (!inView) return;
    const from = shownRef.current;

    if (prefersReducedMotion() || typeof window.requestAnimationFrame !== "function" || from === amount) {
      shownRef.current = amount;
      setShown(amount);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      // Fast first, slowing down on the last figures
      const value = from + (amount - from) * (1 - Math.pow(1 - progress, 3));
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frame = window.requestAnimationFrame(step);
      // Arrival, another currency, a price received while re-evaluating: every roll ends on a pulse
      else setPulses((count) => count + 1);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [amount, inView]);

  return (
    // Positioned: the hidden amount stays inside, or it would widen the page (the layout clips
    // overflow, but not what is absolutely positioned against the page)
    <Box component="span" ref={nodeRef} sx={{ position: "relative", display: "inline-block" }}>
      <Box
        component="span"
        aria-hidden
        key={pulses}
        sx={{
          display: "inline-block",
          fontVariantNumeric: "tabular-nums",
          ...(pulses > 0 && { animation: `${jackpot} 0.6s ease-out` }),
        }}
      >
        {formatMoney(shown, currency)}
      </Box>
      <Box component="span" sx={visuallyHidden}>
        {formatMoney(amount, currency)}
      </Box>
    </Box>
  );
}
