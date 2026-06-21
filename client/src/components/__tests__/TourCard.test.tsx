import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import TourCard from "../TourCard";

// Mock IntersectionObserver for jsdom — must be a constructable function
beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver as any);
});

// Mock useLanguage hook
vi.mock("../../hooks/useLanguage", () => ({
  useLanguage: () => ({ t: (key: string) => key, lang: "cs" }),
}));

describe("TourCard", () => {
  const mockTour = {
    id: 1,
    destination: "Egypt",
    title: "Test Tour",
    price: 15000,
    image: "/test.jpg",
    transport: "plane",
    startDate: "2026-06-01",
    endDate: "2026-06-15",
  };

  it("renders without crashing", () => {
    const onClick = vi.fn();
    render(<TourCard tour={mockTour as any} onClick={onClick} />);
    expect(document.body.textContent).toBeTruthy();
  });

  it("displays the destination name", () => {
    const onClick = vi.fn();
    render(<TourCard tour={mockTour as any} onClick={onClick} />);
    expect(screen.getByText("Egypt")).toBeInTheDocument();
  });

  it("displays the formatted price", () => {
    const onClick = vi.fn();
    render(<TourCard tour={mockTour as any} onClick={onClick} />);
    // The component renders price via formatPrice — check for presence of "from" key
    expect(screen.getByText(/from/)).toBeInTheDocument();
  });

  it("triggers onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<TourCard tour={mockTour as any} onClick={onClick} />);
    const card = screen.getByRole("article");
    card.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
