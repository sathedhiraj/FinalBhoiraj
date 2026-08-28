export const INCOME_CATEGORIES = ["Vargani", "Sponsorship", "Donation"] as const;
export const INCOME_CATEGORY_ICONS: Record<string, string> = {
  Vargani: "🪙",
  Sponsorship: "🤝",
  Donation: "❤️",
};

export const EXPENSE_CATEGORIES = [
  "Mandap",
  "Decoration",
  "Puja Items",
  "Electricity",
  "Printing",
  "DJ / Sound",
  "Prasad",
  "Transport",
] as const;
export const EXPENSE_CATEGORY_ICONS: Record<string, string> = {
  Mandap: "🏛️",
  Decoration: "🎀",
  "Puja Items": "🪔",
  Electricity: "💡",
  Printing: "🖨️",
  "DJ / Sound": "🔊",
  Prasad: "🍱",
  Transport: "🚚",
};

export const PAYMENT_MODES = ["cash", "upi"] as const;
export const PAYMENT_MODE_ICONS: Record<string, string> = {
  cash: "💵",
  upi: "📱",
};

export type ViewKey = "dashboard" | "entries" | "reports" | "festivals" | "settings";
