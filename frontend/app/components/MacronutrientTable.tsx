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
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>name</th>
            <th>calories</th>
            <th>{macronutrient}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.dish}>
              <td>{item.dish}</td>
              <td>{item[macronutrient]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
