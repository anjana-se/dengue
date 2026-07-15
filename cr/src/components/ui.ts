import type { CSSProperties } from "react";
import { color } from "../theme";

/** Full-width call-to-action button style (ported from the design's `ctaStyle`). */
export function ctaStyle(enabled: boolean, bg: string = color.forest): CSSProperties {
  return {
    width: "100%",
    height: 52,
    border: "none",
    borderRadius: 13,
    fontSize: 16,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    background: enabled ? bg : "#c7cfc9",
    color: "#fff",
    transition: "background .2s",
  };
}

/** Tall primary button used on welcome / result screens. */
export function heroButtonStyle(bg: string, shadow: string): CSSProperties {
  return {
    width: "100%",
    height: 54,
    border: "none",
    borderRadius: 14,
    background: bg,
    color: "#fff",
    fontSize: 17,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: shadow,
  };
}
