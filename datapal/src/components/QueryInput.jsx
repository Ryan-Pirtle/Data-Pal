import { useState } from "react";

export default function QueryInput({ onQueryResult, onError }) {
  const [query, setQuery] = useState("");

  return (
    <div className="bg-white p-4 rounded shadow flex">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a question about your dataset..."
        className="flex-1 border p-2 rounded"
      />
      <button
        onClick={() => {
          if (!query.trim()) {
            onError("Query cannot be empty");
          } else {
            // Placeholder for backend
            onQueryResult({ text: `Pretend result for: ${query}` });
          }
        }}
        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Submit
      </button>
    </div>
  );
}
