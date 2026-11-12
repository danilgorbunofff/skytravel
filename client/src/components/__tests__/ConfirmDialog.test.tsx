import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ConfirmDialog from "../ConfirmDialog";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("ConfirmDialog", () => {
  it("calls onConfirm only once when confirm is clicked twice while pending", async () => {
    const pending = deferred();
    const onConfirm = vi.fn(() => pending.promise);
    render(
      <ConfirmDialog
        isOpen
        title="Odeslat kampaň?"
        message="Opravdu?"
        confirmLabel="Odeslat"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Odeslat" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zrušit" })).toBeDisabled();

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    expect(confirm).not.toBeDisabled();
  });

  it("disables confirm while the external loading prop is true", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Smazat?"
        message="Opravdu?"
        confirmLabel="Smazat"
        loading
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Smazat" });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not cancel via Escape while pending", async () => {
    const pending = deferred();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Importovat?"
        message="Opravdu?"
        confirmLabel="Importovat"
        tone="default"
        onConfirm={() => pending.promise}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Importovat" }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
  });

  it("uses a non-destructive confirm button for the default tone", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Importovat?"
        message="Opravdu?"
        confirmLabel="Importovat"
        tone="default"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Importovat" }).className).not.toMatch(/destructive/);
  });
});
