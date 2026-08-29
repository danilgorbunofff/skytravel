import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchAutocomplete } from "../SearchAutocomplete";
import type { Suggestion } from "../SearchAutocomplete";
import type { PublicDestinationSummary } from "../../../../types/providers";

type OnSelect = (suggestion: Suggestion) => void;

const t = (key: string) => key;

const destinations: PublicDestinationSummary[] = [
  {
    slug: "recko",
    czechName: "Řecko",
    canonicalName: "Greece",
    count: 42,
    minPrice: 9990,
  },
] as unknown as PublicDestinationSummary[];

// The component is controlled, so the harness has to own the value — otherwise
// typing never reaches it and no suggestions are computed.
function Harness({
  onSubmit,
  onSelect,
}: {
  onSubmit: (e: React.FormEvent) => void;
  onSelect: OnSelect;
}) {
  const [value, setValue] = useState("");
  return (
    <form onSubmit={onSubmit}>
      <SearchAutocomplete
        t={t}
        value={value}
        onChange={setValue}
        onSelect={onSelect}
        destinations={destinations}
      />
      <button type="submit">GO</button>
    </form>
  );
}

function renderAutocomplete(onSelect: OnSelect = vi.fn<OnSelect>()) {
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
  const utils = render(<Harness onSubmit={onSubmit} onSelect={onSelect} />);
  return { ...utils, onSubmit, onSelect };
}

describe("SearchAutocomplete — Enter key", () => {
  it("submits the surrounding form when no suggestion is highlighted", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderAutocomplete();

    const input = screen.getByRole("combobox");
    await user.type(input, "Recko");

    // Wait for the 200 ms input debounce so suggestions actually render.
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    await user.keyboard("{Enter}");

    // Regression: preventDefault() used to run unconditionally while
    // activeIndex was -1, so Enter silently did nothing here.
    expect(onSubmit).toHaveBeenCalled();
  });

  it("selects the highlighted suggestion and does NOT also submit the form", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { onSubmit } = renderAutocomplete(onSelect);

    const input = screen.getByRole("combobox");
    await user.type(input, "Recko");

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
