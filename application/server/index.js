import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db/db.js";
import userRoutes from "./routes/userRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import cardsRoutes from "./routes/cardsRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import insuranceRoutes from "./routes/insuranceRoutes.js";
import transactionsRoutes from "./routes/transactionsRoutes.js";
import investRoutes from "./routes/investRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

pool.connect()
  .then(client => { console.log("DB Connected"); client.release(); })
  .catch(err => console.error("DB Error:", err.message));

app.use("/api/users", userRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/cards", cardsRoutes);
app.use("/api/loan", loanRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/insurance", insuranceRoutes);
app.use("/api/transaction", transactionsRoutes);
app.use("/api/invest", investRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
