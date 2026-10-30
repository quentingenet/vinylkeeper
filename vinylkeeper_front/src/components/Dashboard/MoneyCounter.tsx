import { useEffect, useRef, useState } from "react";
import { Box, keyframes } from "@mui/material";
import { formatMoney } from "@components/Dashboard/collectionValueLabels";
import type { Currency } from "@models/IDashboardStats";

const DURATION_MS = 1400;

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

// The amount just went up during a re-evaluation: a short gold pulse
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
 * An amount that rolls to its value: from 0 when shown, then from the previous amount when it
 * changes (a re-evaluation in progress, another currency). Screen readers get the final amount.
 */
export default function MoneyCounter({ amount, currency }: MoneyCounterProps) {
  const [shown, setShown] = useState(0);
  const [pulses, setPulses] = useState(0);
  const shownRef = useRef(0);
  const previousAmount = useRef<number | null>(null);

  useEffect(() => {
    const from = shownRef.current;
    if (previousAmount.current !== null && amount > previousAmount.current) setPulses((count) => count + 1);
    previousAmount.current = amount;

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
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [amount]);

  return (
    // Positioned: the hidden amount stays inside, or it would widen the page (the layout clips
    // overflow, but not what is absolutely positioned against the page)
    <Box component="span" sx={{ position: "relative", display: "inline-block" }}>
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
