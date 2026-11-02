import { describe, expect, it } from "vite-plus/test";

import { railResizeDelta, sidebarGrowsRight } from "./sidebarRail";

describe("sidebarGrowsRight", () => {
  it("grows toward the right for a left sidebar in a left-to-right interface", () => {
    expect(sidebarGrowsRight("left", "ltr")).toBe(true);
  });

  it("grows toward the left for a right sidebar in a left-to-right interface", () => {
    expect(sidebarGrowsRight("right", "ltr")).toBe(false);
  });

  it("flips both when the interface is right to left", () => {
    expect(sidebarGrowsRight("left", "rtl")).toBe(false);
    expect(sidebarGrowsRight("right", "rtl")).toBe(true);
  });
});

describe("railResizeDelta", () => {
  it("widens when the pointer moves toward the growing edge", () => {
    expect(railResizeDelta(true, 100, 140)).toBe(40);
    expect(railResizeDelta(false, 100, 60)).toBe(40);
  });

  it("narrows when the pointer moves away from it", () => {
    expect(railResizeDelta(true, 100, 60)).toBe(-40);
    expect(railResizeDelta(false, 100, 140)).toBe(-40);
  });

  it("drags a start-side sidebar outward in Arabic", () => {
    // In Arabic the start-side sidebar sits on the right; dragging its rail left widens it.
    expect(railResizeDelta(sidebarGrowsRight("left", "rtl"), 900, 860)).toBe(40);
  });
});
