// import { useState } from "react";
import FileUpload from "./components/FileUpload";
import ErrorBanner from "./components/ErrorBanner";
import QueryChat from "./components/QueryChat"; 
import SectionHeader from "./components/SectionHeader";


function App() {
  // const [dataset, setDataset] = useState(null);
  // const [error, setError] = useState(null);

  return (
    <div className="flex justify-center items-center h-screen w-screen bg-gray-50">
  <QueryChat />
</div>
  );
}

export default App;
