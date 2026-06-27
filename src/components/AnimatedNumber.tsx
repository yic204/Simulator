import React, { useEffect, useState, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  precision?: number;
  formatter?: (val: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = React.memo(({
  value,
  precision = 2,
  formatter,
  className = "",
  style,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Start from the actual current displayValue (in case we interrupted a previous transition)
    const startVal = prevValueRef.current;
    const endVal = value;
    
    // If they are identical, don't animate
    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    // Cancel any ongoing animation
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const duration = 300; // 300ms as per user instructions
      const progress = Math.min(elapsed / duration, 1);

      // easeOutQuart easing
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startVal + (endVal - startVal) * easeOutQuart;

      prevValueRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value]);

  const output = formatter ? formatter(displayValue) : displayValue.toFixed(precision);

  return (
    <span className={className} style={style}>
      {output}
    </span>
  );
});
