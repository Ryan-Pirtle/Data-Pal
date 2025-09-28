import { useState } from "react";
import FileUpload from "./components/FileUpload";
import QueryInput from "./components/QueryInput";
import ResultsDisplay from "./components/ResultsDisplay";
import ErrorBanner from "./components/ErrorBanner";

function App() {
  const [dataset, setDataset] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Data Pal</h1>

      {error && <ErrorBanner message={error} />}

      <div className="max-w-3xl mx-auto space-y-6">
        <FileUpload onUploadSuccess={setDataset} onError={setError} />
        {dataset && <QueryInput onQueryResult={setResults} onError={setError} />}
        {results && <ResultsDisplay results={results} />}
      </div>
    </div>
  );
}

export default App;
