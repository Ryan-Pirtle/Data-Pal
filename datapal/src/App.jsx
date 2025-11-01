import { useState } from "react";
import FileUpload from "./components/FileUpload";
import ErrorBanner from "./components/ErrorBanner";
import QueryChat from "./components/QueryChat"; 
import SectionHeader from "./components/SectionHeader";


function App() {
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10 px-4 space-y-10">

      {error && (
        <div className="w-full max-w-3xl">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* === Chat Section === */}
      <div className="w-full max-w-3xl bg-white p-6 rounded-2xl shadow-md">
        <SectionHeader
  title="Data Pal Chat"
  subtitle="Chat naturally with your data and visualize insights instantly."
/>
        <QueryChat />
      </div>

      {/* === Upload Section === */}
      <div className="w-full max-w-3xl bg-white p-6 rounded-2xl shadow-md">
        <FileUpload onUploadSuccess={setDataset} onError={setError} />
        {dataset && (
          <p className="text-green-600 font-medium text-center mt-3">
            Dataset uploaded successfully.
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
