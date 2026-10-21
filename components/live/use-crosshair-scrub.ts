"use client";

/**
 * Shared scrub state for the interactive history charts (full HistoryChart and the homepage
 * sparkline). It only ever stores a viewBox x; the charts snap that x to the nearest stored
 * reading with `crosshairSelection()`, so no handler here can create a value.
 *
 * The pointer policy itself is the pure, unit-tested `scrubPointerAction()`.
 */
import * as React from "react";
import {
  CHART_FOCUS_KEYS,
  cursorFromPointer,
  nearestProjectedIndex,
  scrubPointerAction,
  stepFocusIndex,
  type ChartFocusKey,
  type ScrubEventType,
} from "@/lib/chart-interaction";

export function useCrosshairScrub(viewWidth: number) {
  const [cursorX, setCursorX] = React.useState<number | null>(null);

  // The plot's position is measured once per gesture (pointer down / enter) instead of on every
  // move: calling getBoundingClientRect() inside pointermove forces a synchronous layout each frame,
  // which is what makes a scrub stutter on low-end phones. The plot cannot move during a scrub (the
  // HUD above it has a constant height, and a page scroll cancels a touch scrub), and any scroll or
  // resize drops the cached box so the next move re-measures.
  const boxRef = React.useRef<{ left: number; width: number } | null>(null);
  React.useEffect(() => {
    const invalidate = () => {
      boxRef.current = null;
    };
    window.addEventListener("scroll", invalidate, { passive: true, capture: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      window.removeEventListener("scroll", invalidate, { capture: true });
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  const measure = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    boxRef.current = { left: rect.left, width: rect.width };
    return boxRef.current;
  };

  const apply = (type: ScrubEventType, event: React.PointerEvent<HTMLElement>, fresh = false) => {
    const action = scrubPointerAction(type, event.pointerType, event.buttons);
    if (action === "latest") {
      setCursorX(null);
      return;
    }
    if (action !== "select") return;
    const box = fresh || !boxRef.current ? measure(event.currentTarget) : boxRef.current;
    const x = cursorFromPointer(event.clientX - box.left, box.width, viewWidth);
    if (x !== null) setCursorX(x);
  };

  const pointerHandlers = {
    onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
      measure(event.currentTarget);
    },
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => apply("pointerdown", event, true),
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => apply("pointermove", event),
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => apply("pointerup", event),
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => apply("pointercancel", event),
    onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
      boxRef.current = null;
      apply("pointerleave", event);
    },
    onBlur: () => setCursorX(null),
  };

  /** Arrow keys step between stored readings; Home/End jump to the ends; Escape returns to latest. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>, readings: ReadonlyArray<{ x: number }>) => {
    if (event.key === "Escape") {
      setCursorX(null);
      return;
    }
    if (!CHART_FOCUS_KEYS.includes(event.key as ChartFocusKey)) return;
    event.preventDefault();
    const current = cursorX === null ? null : nearestProjectedIndex(readings, cursorX);
    const next = stepFocusIndex(current, readings.length, event.key as ChartFocusKey);
    if (next !== null) setCursorX(readings[next].x);
  };

  return { cursorX, setCursorX, pointerHandlers, onKeyDown };
}
