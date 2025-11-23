import { getMyLoanDetails, getAvailLoanDetails } from "../controllers/loanControllers.js";
import express from "express";

const router = express.Router();

router.post("/getMyLoanDetails", getMyLoanDetails);
router.post("/getAvailLoanDetails", getAvailLoanDetails);

export default router;