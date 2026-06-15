import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonRows } from "../SkeletonRows";

describe("SkeletonRows", () => {
  it("renders without crashing with default props", () => {
    const { container } = render(<SkeletonRows />);
    expect(container.children.length).toBeGreaterThan(0);
  });

  it("renders correct number of skeleton cells", () => {
    const { container } = render(<SkeletonRows count={3} columns={4} />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBe(12); // 3 rows × 4 columns
  });

  it("renders single row with single column", () => {
    const { container } = render(<SkeletonRows count={1} columns={1} />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBe(1);
  });

  it("renders custom height class", () => {
    const { container } = render(<SkeletonRows count={1} columns={1} height="h-8" />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton?.className).toContain("h-8");
  });
});
