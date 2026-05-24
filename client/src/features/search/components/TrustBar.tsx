import type { TranslationKey } from "../../../hooks/useLanguage";

interface Props {
  t: (key: TranslationKey) => string;
}

export function TrustBar({ t }: Props) {
  return (
    <div className="trust-bar">
      <div className="container trust-bar__inner">
        <div className="trust-item">
          <span className="trust-icon">✓</span>
          <span>{t("sTrustVerified")}</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">✓</span>
          <span>{t("sTrustInsured")}</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">✓</span>
          <span>{t("sTrustNoFees")}</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">✓</span>
          <span>{t("sTrustPersonal")}</span>
        </div>
      </div>
    </div>
  );
}
