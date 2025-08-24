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
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0 border border-gray-300">
          <thead>
            <tr>
              <th className="px-3 py-3 border-b text-left text-sm font-medium">
                Name
              </th>
              <th className="px-3 py-3 border-b text-left text-sm font-medium whitespace-nowrap">
                Calories
              </th>
              <th className="px-3 py-3 border-b text-left text-sm font-medium whitespace-nowrap">
                {macronutrient.charAt(0).toUpperCase() + macronutrient.slice(1)}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.dish}>
                <td className="px-3 py-2 border-b text-sm break-words">
                  {item.dish}
                </td>
                <td className="px-3 py-2 border-b text-sm whitespace-nowrap">
                  {item.calories}
                </td>
                <td className="px-3 py-2 border-b text-sm whitespace-nowrap">
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
