import TextInput from "./TextInput";

export default function HomePageRestaurantInput() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <h3>Where are you eating today?</h3>
      <TextInput
        type="text"
        placeholder="Enter restaurant name"
        className="mt-2"
      />
    </div>
  );
}
