import type { FilterFieldDescriptor } from "../../types/providers";

type Props = {
  fields: FilterFieldDescriptor[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
};

export default function ProviderFilterRenderer({ fields, values, onChange }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="alex-filter-row" style={{ marginTop: "0.5rem" }}>
      {fields.map((field) => {
        const parentDisabled =
          field.dependsOn != null &&
          (values[field.dependsOn] === undefined ||
            values[field.dependsOn] === null ||
            values[field.dependsOn] === "" ||
            values[field.dependsOn] === 0);

        // If parent is not selected, clear this field if it has a stale value
        if (parentDisabled && values[field.key] !== undefined && values[field.key] !== "") {
          // Schedule the clear for next tick to avoid setState during render
          queueMicrotask(() => onChange(field.key, undefined));
        }

        switch (field.type) {
          case "select":
            return (
              <div className="alex-filter-field" key={field.key}>
                <label htmlFor={`pf-${field.key}`}>{field.label}</label>
                <select
                  id={`pf-${field.key}`}
                  value={String(values[field.key] ?? "")}
                  disabled={parentDisabled}
                  onChange={(e) =>
                    onChange(field.key, e.target.value === "" ? undefined : e.target.value)
                  }
                >
                  <option value="">Vše</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {parentDisabled && field.dependsOn && (
                  <small style={{ color: "#999" }}>
                    Nejprve vyberte {fields.find((f) => f.key === field.dependsOn)?.label ?? field.dependsOn}
                  </small>
                )}
              </div>
            );

          case "text":
            return (
              <div className="alex-filter-field" key={field.key}>
                <label htmlFor={`pf-${field.key}`}>{field.label}</label>
                <input
                  id={`pf-${field.key}`}
                  type="text"
                  value={String(values[field.key] ?? "")}
                  disabled={parentDisabled}
                  onChange={(e) =>
                    onChange(field.key, e.target.value === "" ? undefined : e.target.value)
                  }
                />
              </div>
            );

          case "number":
            return (
              <div className="alex-filter-field" key={field.key}>
                <label htmlFor={`pf-${field.key}`}>{field.label}</label>
                <input
                  id={`pf-${field.key}`}
                  type="number"
                  value={String(values[field.key] ?? "")}
                  disabled={parentDisabled}
                  onChange={(e) =>
                    onChange(
                      field.key,
                      e.target.value === "" ? undefined : Number(e.target.value),
                    )
                  }
                />
              </div>
            );

          case "date":
            return (
              <div className="alex-filter-field" key={field.key}>
                <label htmlFor={`pf-${field.key}`}>{field.label}</label>
                <input
                  id={`pf-${field.key}`}
                  type="date"
                  value={String(values[field.key] ?? "")}
                  disabled={parentDisabled}
                  onChange={(e) =>
                    onChange(field.key, e.target.value === "" ? undefined : e.target.value)
                  }
                />
              </div>
            );

          case "boolean":
            return (
              <div className="alex-filter-field" key={field.key}>
                <label htmlFor={`pf-${field.key}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    id={`pf-${field.key}`}
                    type="checkbox"
                    checked={Boolean(values[field.key])}
                    disabled={parentDisabled}
                    onChange={(e) => onChange(field.key, e.target.checked || undefined)}
                  />
                  {field.label}
                </label>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
