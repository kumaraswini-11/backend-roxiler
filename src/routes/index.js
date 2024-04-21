import { Router } from "express";
import transactionRouters from "./transaction.routes.js";

const router = Router();

// Mount transaction routes from transaction.routes.js
router.use(transactionRouters);

export default router;
