import { getCardsDetails } from "../controllers/cardsControllers.js";
import express from "express";

const router = express.Router();

router.post("/getCardsDetails",getCardsDetails);

export default router;