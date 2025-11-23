import axios from "axios";

const api = axios.create({
  baseURL: "https://ghci-mobile-server.onrender.com/api",
  headers: { "Content-Type": "application/json" },
});

export default api;
