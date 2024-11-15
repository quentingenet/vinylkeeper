import { useState, useEffect } from "react";

/**
 * Counter component props interface
 * @interface CounterProps
 * @property {number} target - The target number to count to
 * @property {number} duration - The duration of the counting animation in milliseconds
 */
interface CounterProps {
  target: number;
  duration?: number;
}

/**
 * Counter component that animates a number from 0 to the target value
 * @component
 * @param {CounterProps} props - Component props
 * @returns {JSX.Element} Counter component with animated number
 */
function Counter({ target, duration = 2000 }: CounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 10);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        clearInterval(timer);
        setCount(target);
      } else {
        setCount(Math.ceil(start));
      }
    }, 10);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count}</span>;
}

export default Counter;
