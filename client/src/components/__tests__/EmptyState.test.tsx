import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders with custom title", () => {
    render(<EmptyState title="Nothing found" />);
    expect(screen.getByText("Nothing found")).toBeInTheDocument();
  });

  it("renders search variant with default title", () => {
    render(<EmptyState variant="search" />);
    expect(screen.getByText("Nic nenalezeno")).toBeInTheDocument();
  });

  it("renders no-data variant with default title", () => {
    render(<EmptyState variant="no-data" />);
    expect(screen.getByText("Žádná data")).toBeInTheDocument();
  });

  it("renders error variant with default title", () => {
    render(<EmptyState variant="error" />);
    expect(screen.getByText("Chyba při načítání")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState title="Empty" description="This is a description text" />,
    );
    expect(screen.getByText("This is a description text")).toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState title="Empty" action={{ label: "Retry", onClick }} />,
    );
    const btn = screen.getByRole("button", { name: "Retry" });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not render icon for default variant without icon prop", () => {
    const { container } = render(<EmptyState title="Empty" />);
    // No icon wrapper rendered
    const icons = container.querySelectorAll(".text-4xl");
    expect(icons.length).toBe(0);
  });
});
