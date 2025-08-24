import { useState } from "react";

export interface MenuItem {
  dish: string;
  protein: string;
  carbs: string;
  fat: string;
  calories: string;
}

interface MacroNutrientTableProps {
  data: MenuItem[];
  title: string;
  macronutrient: "protein" | "carbs" | "fat" | "calories";
}

export default function MacronutrientTable({
  data,
  title,
  macronutrient,
}: MacroNutrientTableProps) {
  const [isReversed, setIsReversed] = useState(false);

  const displayData = isReversed ? [...data].reverse() : data;

  const toggleOrder = () => {
    setIsReversed(!isReversed);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={toggleOrder}
          className="px-3 py-1 text-sm bg-foreground/10 hover:bg-foreground/20 rounded transition-colors duration-200 flex items-center gap-1"
          title={`Sort ${isReversed ? "ascending" : "descending"}`}
        >
          <span className="text-xs">{isReversed ? "↑" : "↓"}</span>
          <span>{isReversed ? "Low to High" : "High to Low"}</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 border border-foreground/20">
          <thead>
            <tr>
              <th className="px-3 py-3 border-b border-foreground/20 text-left text-sm font-medium">
                Name
              </th>
              <th className="px-3 py-3 border-b border-foreground/20 text-left text-sm font-medium whitespace-nowrap">
                Calories
              </th>
              <th className="px-3 py-3 border-b border-foreground/20 text-left text-sm font-medium whitespace-nowrap">
                {macronutrient.charAt(0).toUpperCase() + macronutrient.slice(1)}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((item) => (
              <tr key={item.dish}>
                <td className="px-3 py-2 border-b border-foreground/20 text-sm break-words">
                  {item.dish}
                </td>
                <td className="px-3 py-2 border-b border-foreground/20 text-sm whitespace-nowrap">
                  {item.calories}
                </td>
                <td className="px-3 py-2 border-b border-foreground/20 text-sm whitespace-nowrap">
                  {item[macronutrient]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
