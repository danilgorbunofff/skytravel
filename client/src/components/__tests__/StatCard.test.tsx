import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "../admin/StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Visits" value="1000" />);
    expect(screen.getByText("Visits")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
  });

  it("renders loading state with skeleton placeholders", () => {
    const { container } = render(<StatCard label="Visits" value="" loading />);
    const animatedElements = container.querySelectorAll(".animate-pulse");
    expect(animatedElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders positive change indicator", () => {
    render(<StatCard label="Revenue" value="5000" change="+15%" up />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("5000")).toBeInTheDocument();
    expect(screen.getByText("+15%")).toBeInTheDocument();
  });

  it("renders negative change indicator", () => {
    render(<StatCard label="Revenue" value="5000" change="-5%" up={false} />);
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("does not render change section when change prop is omitted", () => {
    const { container } = render(<StatCard label="Visits" value="1000" />);
    // The change element with trending icon should not be present
    const changeElements = container.querySelectorAll(".text-xs.font-medium");
    expect(changeElements.length).toBe(0);
  });
});
