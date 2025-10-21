export default function FileUpload({ onUploadSuccess, onError }) {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      onError("No file selected");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw data;

      onUploadSuccess(data.message);
    } catch (err) {
      onError(err.detail || "Failed to upload file");
    }
  };

  return (
    <div className="border-2 border-dashed p-6 text-center rounded bg-white shadow">
      <p className="mb-2">Upload your dataset (CSV)</p>
      <input
        type="file"
        accept=".csv"
        className="block mx-auto"
        onChange={handleFileChange}
      />
    </div>
  );
}
