import { Router } from "express";
import userController from "../controllers/userController";

const router = Router();

router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.patch("/:id", userController.updateUserById);
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.delete("/:id", userController.deleteUser);

export default router;
