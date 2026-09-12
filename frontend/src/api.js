import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});


export async function uploadPdf(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/documents/upload", formData);
    return response.data;
  } catch (error) {
    const detail = error?.response?.data?.detail;
    console.error("Upload failed:", detail || error.message);
    throw new Error(typeof detail === "string" ? detail : "Failed to upload PDF");
  }
}

export async function askQuestion(question) {
  try {
    const response = await api.post("/api/query",{question});
    return response.data;
  } catch (error) {
    const detail = error?.response?.data?.detail;
    console.error("Query failed:", detail || error.message);
    throw new Error(typeof detail === "string" ? detail : "Failed to fetch response");
  }
}
