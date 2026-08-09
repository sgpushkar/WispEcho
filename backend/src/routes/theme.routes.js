import { Router } from "express";
import * as themeController from "../controllers/themeController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", themeController.getCustomThemes);
router.post("/", themeController.createCustomTheme);
router.patch("/:id", themeController.updateCustomTheme);
router.delete("/:id", themeController.deleteCustomTheme);

export default router;
