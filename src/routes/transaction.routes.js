import { Router } from "express";
import {
  seedAllDataFromApi,
  listTransactions,
  getStatistics,
  getBarChartData,
  getPieChartData,
  getCombinedData,
} from "../controllers/transaction.controllers.js";

const router = Router();

router.route("/seed-data").get(seedAllDataFromApi);
router.route("/all-transactions").get(listTransactions);
router.route("/statistics").get(getStatistics);
router.route("/bar-chart-data").get(getBarChartData);
router.route("/pie-chart-data").get(getPieChartData);
router.route("/combined-data").get(getCombinedData);

export default router;
