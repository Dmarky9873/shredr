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
    <div>
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Calories</th>
            <th>
              {macronutrient.charAt(0).toUpperCase() + macronutrient.slice(1)}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.dish}>
              <td>{item.dish}</td>
              <td>{item.calories}</td>
              <td>{item[macronutrient]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
