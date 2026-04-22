export type MarketDataSnapshot = {
  ufValue: number | null;
  ufDate: string | null;
  ufSource: "manual" | "mindicador" | "cmf";
  ufLabel: string;
  warning: string | null;
  fetchedAt: string;
};
