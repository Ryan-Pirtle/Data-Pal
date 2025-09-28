export default function ErrorBanner({ message }) {
  return (
    <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">
      {message}
    </div>
  );
}
