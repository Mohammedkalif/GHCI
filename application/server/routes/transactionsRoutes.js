import { getTransactionsDetails, transferMoney, getRecentTransactionDetails } from "../controllers/transactionsControllers.js";
import express from "express";

const router = express.Router();

router.post("/getTransactionsDetails", getTransactionsDetails);
router.post("/getRecentTransactionsDetails", getRecentTransactionDetails);
router.post("/transferMoney", transferMoney);

export default router;