import { Router } from "express";
import { getOutfit } from "../controllers/outfitController";

const router = Router();
router.get("/simple", getOutfit);
export default router;
