import { BudgetLevel, StockStatus, type EquipmentCategory, type EquipmentItem } from "@prisma/client";

type RecommendationInput = {
  customerBudgetRange?: string;
  requiredCapacityWatts?: number;
  category: EquipmentCategory;
  equipment: EquipmentItem[];
};

export function recommendEquipmentOptions(input: RecommendationInput) {
  const candidates = input.equipment
    .filter((item) => item.category === input.category)
    .map((item) => ({ item, score: scoreEquipment(item, input) }))
    .sort((a, b) => b.score - a.score);

  return {
    bestBudget: candidates.find((candidate) => candidate.item.budgetLevel === BudgetLevel.BUDGET)?.item ?? null,
    bestValue: candidates.find((candidate) => candidate.item.budgetLevel === BudgetLevel.VALUE)?.item ?? null,
    bestPremium: candidates.find((candidate) => candidate.item.budgetLevel === BudgetLevel.PREMIUM)?.item ?? null,
    ranked: candidates,
  };
}

export function scoreEquipment(item: EquipmentItem, input: Omit<RecommendationInput, "equipment">) {
  const price = Number(item.price);
  const priceScore = normalizePrice(price, input.customerBudgetRange);
  const stockScore = item.stockStatus === StockStatus.IN_STOCK ? 100 : item.stockStatus === StockStatus.LOW_STOCK ? 70 : item.stockStatus === StockStatus.PREORDER ? 45 : 20;
  const warrantyScore = warrantyToScore(item.warranty);
  const compatibilityScore = item.compatibilityNotes?.toLowerCase().includes("confirm") ? 45 : 70;

  return Math.round(
    priceScore * 0.15 +
      warrantyScore * 0.12 +
      stockScore * 0.14 +
      compatibilityScore * 0.09 +
      item.reliabilityScore * 0.14 +
      item.localSupportScore * 0.1 +
      item.installerFeedbackScore * 0.1 +
      item.vendorTrustScore * 0.08 +
      item.finalRecommendationScore * 0.04 +
      item.adminScore * 0.04,
  );
}

function normalizePrice(price: number, budgetRange?: string) {
  const range = (budgetRange ?? "").toLowerCase();
  if (!range) return 60;
  if (range.includes("premium")) return price > 0 ? 75 : 30;
  if (range.includes("budget") || range.includes("under")) return price <= 1000000 ? 90 : price <= 2000000 ? 65 : 35;
  return price <= 3000000 ? 80 : 55;
}

function warrantyToScore(warranty?: string) {
  const value = (warranty ?? "").toLowerCase();
  const years = value.match(/(\d+)\s*(year|yr)/)?.[1];
  if (years) return Math.min(100, 50 + Number(years) * 10);
  if (value.includes("pending") || value.includes("confirm")) return 45;
  return value ? 65 : 35;
}
