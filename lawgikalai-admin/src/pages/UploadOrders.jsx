import React, { useState } from "react";
import axios from "axios";

const UploadOrders = () => {
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [responseMsg, setResponseMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pdfFile) {
      return alert("Please upload a PDF file");
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("order", pdfFile); // must match multer field name 'order'

    try {
      const res = await axios.post("https://lawgikalai-auth-api.onrender.com/api/orders/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResponseMsg(`✅ ${res.data.message}`);
      console.log("Uploaded Order:", res.data);
      setTitle("");
      setPdfFile(null);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setResponseMsg("❌ Upload failed. See console for details.");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Upload Court Order PDF</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Order Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files[0])}
          className="w-full border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Upload
        </button>
        {responseMsg && <p className="mt-2">{responseMsg}</p>}
      </form>
    </div>
  );
};

export default UploadOrders;
