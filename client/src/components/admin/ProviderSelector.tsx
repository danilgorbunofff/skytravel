import type { ProviderMeta } from "../../types/providers";

type Props = {
  providers: ProviderMeta[];
  selectedProviderId: string;
  onChange: (providerId: string) => void;
};

export default function ProviderSelector({ providers, selectedProviderId, onChange }: Props) {
  return (
    <section className="admin-card">
      <div className="alex-country-bar">
        <label>
          <strong>Zdroj:</strong>
        </label>
        <div className="alex-country-tabs">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`alex-country-tab${selectedProviderId === p.id ? " is-active" : ""}`}
              onClick={() => {
                if (p.id !== selectedProviderId) onChange(p.id);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
