// src/UploadPage.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://127.0.0.1:8000/api";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("CV");
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const fetchDocs = async () => {
    const res = await axios.get(`${API}/documents/`);
    setDocs(res.data);
  };
  useEffect(() => { fetchDocs(); }, []);

  const handlePick = () => fileInputRef.current?.click();

  const handleUpload = async () => {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    data.append("doc_type", docType);
    setUploading(true);
    try {
      await axios.post(`${API}/documents/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (!e.total) return;
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      setFile(null);
      setProgress(0);
      await fetchDocs();
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    await axios.delete(`${API}/documents/${id}/`);
    await fetchDocs();
  };

  return (
    <div className="container">
      <div className="hero">
        <div>
          <div className="badge">Step 1 · Upload documents</div>
          <h1 className="h1">Upload Document</h1>
          <p className="sub">PDF, DOCX, PNG, JPG · up to 10MB each</p>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept={docType === "PROFILE_IMAGE" ? ".png,.jpg,.jpeg" : ".pdf,.docx,.png,.jpg,.jpeg"}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            <button className="btn btn-outline" onClick={handlePick}>
              Choose File
            </button>

            <select
              className="select"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="CV">CV / Résumé</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="RECOMMENDATION">Recommendation Letter</option>
              <option value="PROFILE_IMAGE">Profile Image</option>
              <option value="OTHER">Other</option>
            </select>

            <button className="btn" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? `Uploading… ${progress}%` : "Upload"}
            </button>

            <div>
            {docType === "PROFILE_IMAGE" && (
                <span className="meta">PNG/JPG only · will appear on your portfolio</span>
            )}
            {file && (
                <span className="meta">
                {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
            )}
          </div>

          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Type</th>
                  <th className="th">Size</th>
                  <th className="th">Uploaded</th>
                  <th className="th" style={{textAlign:"right"}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 && (
                  <tr className="row">
                    <td className="td" colSpan={5} style={{color:"#6b7280"}}>
                      No documents yet.
                    </td>
                  </tr>
                )}
                {docs.map((d) => (
                  <tr key={d.id} className="row">
                    <td className="td">
                      <div className="nameCell">
                        <span className="docIcon">≡</span>
                        <a className="link" href={d.file} target="_blank" rel="noreferrer">
                          {d.title || d.original_name}
                        </a>
                      </div>
                    </td>
                    <td className="td">{d.doc_type}</td>
                    <td className="td">{(d.size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
                    <td className="td">{new Date(d.uploaded_at).toLocaleString()}</td>
                    <td className="td actions">
                      <button className="btn btn-outline" onClick={() => deleteDoc(d.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {uploading && (
              <div style={{marginTop:14}}>
                <div style={{height:10, background:"#eef2ff", borderRadius:999}}>
                  <div
                    style={{
                      height:"100%",
                      width:`${progress}%`,
                      background:"linear-gradient(90deg,#8b5cf6,#6366f1)",
                      borderRadius:999,
                      transition:"width .15s ease"
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="footerImg">
          <div className="docSheet" />
          <div className="docLines">
            <div/><div/><div/><div/><div/><div/><div/>
          </div>
        </div>
      </div>
    </div>
  );
}
