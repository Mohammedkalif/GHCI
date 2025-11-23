import { getAvailInvestDetails, getMyInvestDetails } from "../controllers/investControllers.js";
import express from "express";

const router = express.Router();

router.post("/getMyInvestDetails", getMyInvestDetails);
router.post("/getAvailInvestDetails", getAvailInvestDetails);

export default router;