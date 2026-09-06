import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("рендерит стартовый экран по умолчанию без ошибок", () => {
    render(<App />);
    expect(screen.getByText("NoesDize")).toBeInTheDocument();
  });
});
