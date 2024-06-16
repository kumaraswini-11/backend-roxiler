import { Router } from "express";
import {
  seedAllDataFromApi,
  listTransactions,
  getStatistics,
  getBarChartData,
  getPieChartData,
  getCombinedData,
  deleteRecord,
} from "../controllers/transaction.controllers.js";

const router = Router();

router.route("/seed-data").get(seedAllDataFromApi);
router.route("/all-transactions").get(listTransactions);
router.route("/statistics").get(getStatistics);
router.route("/bar-chart-data").get(getBarChartData);
router.route("/pie-chart-data").get(getPieChartData);
router.route("/combined-data").get(getCombinedData);

// http://localhost:9000/api/v1/delete?id=123456789&month=2
router.route("/delete").delete(deleteRecord);

export default router;
