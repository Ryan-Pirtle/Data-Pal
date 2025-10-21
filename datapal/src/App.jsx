import { useState } from "react";
import FileUpload from "./components/FileUpload";
// import QueryInput from "./components/QueryInput";
import ResultsDisplay from "./components/ResultsDisplay";
import ErrorBanner from "./components/ErrorBanner";
import QueryChat from "./components/QueryChat"; 

function App() {
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold">Data Pal</h1>

      {error && <ErrorBanner message={error} />}

      {/* ===  Upload Form Section === */}
      <div className="max-w-3xl space-y-6 bg-white p-6 rounded-2xl shadow">
        <FileUpload onUploadSuccess={setDataset} onError={setError} />
        {dataset && (
          <p className="text-green-600 font-medium">
            Dataset uploaded successfully.
          </p>
        ) }
      </div>

      {/* === Chat-style Query Interface === */}
      <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded-2xl shadow">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Data Pal Chat
        </h2>
        <QueryChat />
      </div>
    </div>
  );
}

export default App;
