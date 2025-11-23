import { getMyInsuranceDetails, getAvailInsuranceDetails } from "../controllers/insuranceControllers.js";
import express from "express";

const router = express.Router();

router.post("/getMyInsuranceDetails", getMyInsuranceDetails);
router.post("/getAvailInsuranceDetails", getAvailInsuranceDetails);

export default router;