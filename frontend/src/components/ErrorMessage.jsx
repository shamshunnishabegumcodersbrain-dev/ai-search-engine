export default function ErrorMessage({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
      <p className="text-red-700 font-medium">Something went wrong</p>
      <p className="text-red-500 text-sm mt-1">{message}</p>
    </div>
  );
}