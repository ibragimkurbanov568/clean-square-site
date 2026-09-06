import { IconSearch } from "./Icons";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** Поле поиска проектов по названию (F8, показывается при 10+ проектах). */
export function SearchField({ value, onChange }: SearchFieldProps) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "var(--nd-space-3)",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--nd-color-text-muted)",
          display: "flex",
        }}
      >
        <IconSearch />
      </span>
      <input
        className="nd-input"
        style={{ paddingLeft: "calc(var(--nd-space-3) * 2 + 18px)" }}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Найти проект по названию"
        aria-label="Найти проект по названию"
      />
    </div>
  );
}
