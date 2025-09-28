export default function ResultsDisplay({ results }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-2">Results</h2>
      {results.text && <p>{results.text}</p>}
      {results.graph && (
        <img src={results.graph} alt="Graph" className="mt-4 rounded" />
      )}
    </div>
  );
}
