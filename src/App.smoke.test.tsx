import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, "", "/");
});

afterEach(() => {
  cleanup();
});

describe("smoke: full flow", () => {
  it("empty start screen -> wizard -> editor -> add section -> export", async () => {
    render(<App />);

    // Empty state on "/"
    expect(await screen.findByText("Соберите свой первый сайт")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Создать первый сайт" }));

    // Wizard
    expect(await screen.findByText("Новый сайт")).toBeInTheDocument();
    const nameInput = screen.getByLabelText("Название бизнеса");
    fireEvent.change(nameInput, { target: { value: "Кофейня Атмосфера" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать сайт" }));

    // Editor
    await waitFor(() => {
      expect(screen.getByText("Секции сайта (4/12)")).toBeInTheDocument();
    });

    // Type into a section title field per-keystroke and ensure it sticks
    fireEvent.click(screen.getAllByRole("button", { name: "Изменить текст секции" })[0]);
    const titleField = await screen.findByLabelText("Заголовок");
    fireEvent.change(titleField, { target: { value: "Моё название" } });
    expect((titleField as HTMLInputElement).value).toBe("Моё название");

    // Switch settings tab and back — value should persist (no unmount loss)
    fireEvent.click(screen.getByRole("tab", { name: "Настройки" }));
    fireEvent.click(screen.getByRole("tab", { name: "Секции" }));
    const titleFieldAgain = await screen.findByLabelText("Заголовок");
    expect((titleFieldAgain as HTMLInputElement).value).toBe("Моё название");
    fireEvent.click(screen.getByRole("button", { name: "Свернуть" }));

    // Add a section via library dialog
    fireEvent.click(screen.getByRole("button", { name: /Добавить секцию/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByText("Тарифы"));
    await waitFor(() => {
      expect(screen.getByText("Секции сайта (5/12)")).toBeInTheDocument();
    });

    // Theme switch
    fireEvent.click(screen.getByRole("tab", { name: "Настройки" }));
    const themeRadios = screen.getAllByRole("radio").filter((el) => el.closest(".nd-theme-card"));
    expect(themeRadios.length).toBeGreaterThan(0);
    fireEvent.click(themeRadios[1]);

    // Export button should be enabled (hero visible) and clickable without throwing.
    // Both the compact header button and the full preview-toolbar button exist in
    // the DOM at all times (responsive CSS toggles `display`, not mount/unmount —
    // see docs/02-ux.md, «Три сложных момента», п.3); jsdom does not evaluate the
    // `min-width` media query the same way a real browser viewport would, so this
    // smoke test targets the button role-name that is unambiguous in both cases.
    const exportButton = screen.getByRole("button", { name: "Скачать" });
    fireEvent.click(exportButton);
    expect(await screen.findAllByText(/Готово/)).toBeTruthy();

    // Back to list
    fireEvent.click(screen.getByRole("button", { name: "Назад к списку проектов" }));
    await waitFor(() => {
      expect(screen.getByText("Кофейня Атмосфера")).toBeInTheDocument();
    });
  });
});
