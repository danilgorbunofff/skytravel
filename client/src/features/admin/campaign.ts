export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CampaignDraftState = {
  subject: string;
  fromEmail: string;
  editorEmpty: boolean;
  /** Server-counted consented leads; null while loading or when the count failed. */
  recipientCount: number | null;
  recipientCountError: boolean;
};

/**
 * Why the campaign cannot be sent yet, or null when it can. Shown next to the
 * disabled send button so the admin knows what to fix.
 */
export function getSendBlockedReason(state: CampaignDraftState): string | null {
  if (state.recipientCountError) return "Nepodařilo se zjistit počet příjemců. Obnovte stránku.";
  if (state.recipientCount === null) return "Načítám počet příjemců…";
  if (state.recipientCount === 0) return "Žádný kontakt nemá marketingový souhlas.";
  if (!state.subject.trim()) return "Doplňte předmět e-mailu.";
  if (!EMAIL_RE.test(state.fromEmail)) return "Opravte adresu odesílatele.";
  if (state.editorEmpty) return "Doplňte obsah e-mailu.";
  return null;
}
