import React, { useState, useRef, useEffect } from "react";
import "../katex-init";
import katex from "katex";
import "katex/dist/contrib/mhchem.min.js";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  math: string;
  block?: boolean;
  ce?: boolean;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  math = "",
  block = false,
  ce = false,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eqRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  
  // Keep font sizes fixed and readable as per user requirement: Do NOT reduce font size further.
  const fixedFontSize = block ? 25 : 18;

  let formattedMath = ce ? `\\ce{${math}}` : math;
  // Normalize unicode minus character (and other hyphens) to standard ASCII minus for LaTeX compatibility
  formattedMath = formattedMath.replace(/−/g, "-");

  // Render using our local katex instance (which is extended by mhchem)
  const renderedHtml = (() => {
    try {
      return katex.renderToString(formattedMath, {
        displayMode: block,
        throwOnError: false,
        trust: true,
      });
    } catch (err) {
      console.error("KaTeX rendering error:", err);
      return `<span class="katex-error" style="color: #ef4444;">${formattedMath}</span>`;
    }
  })();

  const adjustLayout = () => {
    if (!block) return;
    if (!containerRef.current || !scrollRef.current || !eqRef.current) return;

    const scrollElement = scrollRef.current;
    const eqElement = eqRef.current;

    // Measure available width inside the scroll container
    const containerWidth = scrollElement.getBoundingClientRect().width || scrollElement.offsetWidth;

    // Find the actual inner KaTeX content if any, to measure width precisely.
    const katexElement = eqElement.querySelector(".katex") as HTMLElement;
    const unscaledEqWidth = katexElement 
      ? (katexElement.offsetWidth || katexElement.getBoundingClientRect().width) 
      : (eqElement.offsetWidth || eqElement.scrollWidth);

    if (containerWidth > 0 && unscaledEqWidth > 0) {
      if (unscaledEqWidth <= containerWidth) {
        setScale(1);
      } else {
        // Equation is larger than container. Scale it down until it fits.
        let neededScale = containerWidth / unscaledEqWidth;

        // If scaling is insufficient (e.g., scale limit is reached), enable horizontal scrolling INSIDE the equation box only.
        const MIN_SCALE = 0.6;
        if (neededScale < MIN_SCALE) {
          setScale(MIN_SCALE);
        } else {
          setScale(neededScale);
        }
      }
    }
  };

  // Adjust layout after mount/update and parent element resizes
  useEffect(() => {
    if (!block) return;

    adjustLayout();

    const container = containerRef.current;
    if (!container) return;

    // Observe parent/container resize to adjust alignment dynamically
    const resizeObserver = new ResizeObserver(() => {
      adjustLayout();
    });
    resizeObserver.observe(container);

    // Also observe the equation element to handle changes in content
    const eqElement = eqRef.current;
    if (eqElement) {
      resizeObserver.observe(eqElement);
    }

    // fallback triggers for initial/layout safety
    const timer = setTimeout(adjustLayout, 100);
    const frameId = requestAnimationFrame(adjustLayout);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
    };
  }, [math, block, formattedMath]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .equation-card {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        .equation-scroll {
          width: 100% !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          white-space: nowrap !important;
        }

        .katex-display,
        .MathJax {
          display: inline-block !important;
          max-width: 100% !important;
          transform-origin: left center !important;
        }

        /* Prevent clipping of KaTeX elements */
        .katex {
          display: inline-block !important;
          white-space: nowrap !important;
        }
        .katex-html {
          display: inline-block !important;
          white-space: nowrap !important;
        }
      `}} />

      {block ? (
        <div
          ref={containerRef}
          className={`equation-card select-all text-center transition-all duration-300 ${className}`}
          style={{
            fontSize: `${fixedFontSize}px`,
            minHeight: "175px",
            borderRadius: "18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "stretch",
            padding: "38px",
            boxSizing: "border-box",
            height: "auto",
            wordBreak: "normal",
            whiteSpace: "nowrap",
          }}
        >
          <div
            ref={scrollRef}
            className="equation-scroll"
            style={{
              display: "flex",
              justifyContent: scale < 1 ? "flex-start" : "center",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              ref={eqRef}
              style={{
                transform: `scale(${scale})`,
                display: "inline-block",
                maxWidth: "100%",
                transformOrigin: "left center",
              }}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </div>
      ) : (
        <span
          ref={containerRef}
          className={`select-all ${className}`}
          style={{
            fontSize: `${fixedFontSize}px`,
            display: "inline-block",
            width: "auto",
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "4px 8px",
            whiteSpace: "nowrap",
          }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}
    </>
  );
};
