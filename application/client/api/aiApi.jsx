// api/aiApi.jsx — ALL AI & SPEECH ENDPOINTS
import axios from 'axios';

const API_BASE = "http://10.70.250.130:8000";

const aiApi = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export default aiApi;