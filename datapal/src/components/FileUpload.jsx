export default function FileUpload({ onUploadSuccess, onError }) {
  return (
    <div className="border-2 border-dashed p-6 text-center rounded bg-white shadow">
      <p className="mb-2">Upload your dataset (CSV/Excel)</p>
      <input
        type="file"
        accept=".csv,.xlsx"
        className="block mx-auto"
        onChange={(e) => {
          if (e.target.files.length > 0) {
            onUploadSuccess(e.target.files[0]); // Placeholder for backend call
          } else {
            onError("No file selected");
          }
        }}
      />
    </div>
  );
}
