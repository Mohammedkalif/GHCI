import { getAvailPolicyDetails, getMyPolicyDetails } from "../controllers/policyControllers.js";
import express from "express";

const router = express.Router();

router.post("/getMyPolicyDetails", getMyPolicyDetails);
router.post("/getAvailPolicyDetails", getAvailPolicyDetails);

export default router;