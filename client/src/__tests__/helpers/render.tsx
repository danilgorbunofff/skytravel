import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import type { ReactElement } from "react";

export function renderWithProviders(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
  });
}
