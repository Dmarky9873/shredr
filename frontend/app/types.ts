export type MenuItem = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutrition_source?: "pdf" | "calculated" | "ai_estimated";
  estimated_fields?: string[];
  field_sources?: Record<string, "pdf" | "calculated_from_macros" | "ai_estimated">;
};
