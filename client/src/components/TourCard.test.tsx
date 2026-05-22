import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TourCard from "./TourCard";
import type { OwnTour } from "../data";

const mockTour: OwnTour = {
  destination: "Egypt",
  title: "Letní zájezd",
  price: 15990,
  image: "https://example.com/tour.jpg",
};

describe("TourCard", () => {
  it("renders destination name", () => {
    render(<TourCard tour={mockTour} onClick={() => {}} />);
    expect(screen.getByText("Egypt")).toBeInTheDocument();
  });

  it("renders title", () => {
    render(<TourCard tour={mockTour} onClick={() => {}} />);
    expect(screen.getByText("Letní zájezd")).toBeInTheDocument();
  });

  it("renders formatted price with Kč", () => {
    render(<TourCard tour={mockTour} onClick={() => {}} />);
    const priceText = screen.getByText(/15.*990.*Kč/);
    expect(priceText).toBeInTheDocument();
  });

  it("renders image with lazy loading", () => {
    render(<TourCard tour={mockTour} onClick={() => {}} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TourCard tour={mockTour} onClick={onClick} />);
    await user.click(screen.getByRole("article"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("uses i18n destination when available", () => {
    const tourWithI18n: OwnTour = {
      ...mockTour,
      i18n: { cs: { destination: "Egyptský sen" } },
    };
    render(<TourCard tour={tourWithI18n} onClick={() => {}} />);
    expect(screen.getByText("Egyptský sen")).toBeInTheDocument();
  });
});
