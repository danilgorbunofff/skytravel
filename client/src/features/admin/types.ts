export type { OwnTour } from "../../data";

export type Lead = {
  id: number;
  email: string;
  destination?: string | null;
  marketingConsent: boolean;
  gdprConsent: boolean;
  createdAt: string;
};
