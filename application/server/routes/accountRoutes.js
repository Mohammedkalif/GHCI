import { getAccountDetails, getAccountBalance, getAccountNumber, getPrimaryAccount } from "../controllers/accountControllers.js";
import express from "express";

const router = express.Router();

router.post("/getAccountDetails",getAccountDetails);
router.post("/getAccountBalance",getAccountBalance);
router.post("/getAccountNumber",getAccountNumber);
router.post("/getPrimaryAccount",getPrimaryAccount);

export default router;