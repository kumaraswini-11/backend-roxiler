import axios from "axios";
import Transaction from "../models/transaction.models.js";
import { SEED_THIRD_PARTY_URI as apiUrl } from "../constants.js";

// Function to seed data from API
const seedAllDataFromApi = async (req, res) => {
  try {
    const { data: apiData } = await axios.get(apiUrl);

    if (!Array.isArray(apiData) || apiData.length === 0) {
      return res.status(400).json({ message: "Invalid API data format" });
    }

    const formattedData = apiData.map(
      ({ title, description, category, price, sold, dateOfSale, image }) => ({
        title,
        description,
        category,
        price,
        sold,
        dateOfSale,
        image,
      })
    );

    await Transaction.insertMany(formattedData);
    res.json({ message: "Data seeded successfully" });
  } catch (error) {
    console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to seed data" });
  }
};

// Function to validate month number
const isValidMonth = (month) => {
  return !isNaN(month) && month >= 1 && month <= 12;
};

// Function to construct MongoDB query based on month and searchText
const constructQuery = (month, searchText) => {
  const finalQuery = {
    $expr: {
      $eq: [{ $month: "$dateOfSale" }, Number(month)],
    },
  };

  if (searchText && searchText.trim() !== "") {
    const regexSearchText = searchText.trim();
    const textSearchQuery = {
      $or: [
        { title: { $regex: regexSearchText, $options: "i" } },
        { description: { $regex: regexSearchText, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$price" },
              regex: regexSearchText,
              options: "i",
            },
          },
        },
      ],
    };

    return {
      $and: [finalQuery, textSearchQuery],
    };
  }

  return finalQuery;
};

const listTransactions = async (req, res) => {
  let {
    month: selectedMonth,
    searchText = "",
    page = 1,
    perPage = 10,
  } = req.query;

  if (!isValidMonth(selectedMonth)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  page = parseInt(page);
  perPage = parseInt(perPage);
  if (isNaN(page) || isNaN(perPage) || page <= 0 || perPage <= 0) {
    return res.status(400).json({ message: "Invalid pagination parameters" });
  }

  const skip = (page - 1) * perPage;
  const query = constructQuery(selectedMonth, searchText);

  try {
    const transactions = await Transaction.find(query)
      .skip(skip)
      .limit(perPage);
    const totalRecords = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / perPage);

    res.json({
      totalRecords,
      totalPages,
      currentPage: page,
      perPage,
      data: transactions,
    });
  } catch (error) {
    console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to list transactions" });
  }
};

const getStatistics = async (req, res) => {
  const { month: monthNumber } = req.query;

  if (!isValidMonth(monthNumber)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  try {
    const totalSoldRecords = await Transaction.aggregate([
      {
        $match: {
          $and: [
            {
              $expr: {
                $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)],
              },
            },
            { sold: true },
          ],
        },
      },
    ]);

    const totalNotSoldRecords = await Transaction.aggregate([
      {
        $match: {
          $and: [
            {
              $expr: {
                $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)],
              },
            },
            { sold: false },
          ],
        },
      },
    ]);

    const totalSaleAmount = await Transaction.aggregate([
      {
        $match: {
          sold: true,
          $expr: {
            $and: { $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)] },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$price" },
        },
      },
    ]);

    console.log(totalSaleAmount);
    res.json({
      totalSaleAmount:
        totalSaleAmount.length > 0 ? totalSaleAmount[0].totalSales : 0,
      totalSoldItems: totalSoldRecords.length,
      totalNotSoldItems: totalNotSoldRecords.length,
    });
  } catch (error) {
    console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
};

const getBarChartData = async (req, res) => {
  const { month: monthNumber } = req.query;

  if (monthNumber && !isValidMonth(monthNumber)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  try {
    const priceRanges = [
      "0 - 100",
      "101 - 200",
      "201 - 300",
      "301 - 400",
      "401 - 500",
      "501 - 600",
      "601 - 700",
      "701 - 800",
      "801 - 900",
      "901 - above",
    ];

    const matchQuery = monthNumber
      ? {
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)],
          },
        }
      : {};

    const barChartData = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $switch: {
              branches: priceRanges.map((range) => ({
                case: {
                  $and: [
                    { $lte: ["$price", parseInt(range.split(" - ")[1])] },
                    { $gt: ["$price", parseInt(range.split(" - ")[0])] },
                  ],
                },
                then: range,
              })),
              default: "901 - above",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedData = {};
    priceRanges.forEach((range) => {
      const matchedData = barChartData.find((item) => item._id === range);
      formattedData[range] = matchedData ? matchedData.count : 0;
    });

    res.json(formattedData);
  } catch (error) {
    console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to fetch bar chart data" });
  }
};

const getPieChartData = async (req, res) => {
  const { month: monthNumber } = req.query;

  if (monthNumber && !isValidMonth(monthNumber)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  try {
    const matchQuery = monthNumber
      ? {
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)],
          },
        }
      : {};

    const categoryData = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedData = categoryData.map((item) => ({
      category: item._id,
      count: item.count,
    }));

    res.json(formattedData);
  } catch (error) {
    console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to fetch pie chart data" });
  }
};

const getCombinedData = async (req, res) => {
  const { month: monthNumber } = req.query;

  if (!isValidMonth(monthNumber)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  try {
    const domain = "http://localhost:9000/api/v1";

    const [statisticsResponse, barChartResponse, pieChartResponse] =
      await Promise.all([
        axios.get(`${domain}/statistics?month=${monthNumber}`),
        axios.get(`${domain}/bar-chart-data?month=${monthNumber}`),
        axios.get(`${domain}/pie-chart-data?month=${monthNumber}`),
      ]);

    const combinedData = {
      statisticsData: statisticsResponse.data,
      barChartData: barChartResponse.data,
      pieChartData: pieChartResponse.data,
    };

    res.json(combinedData);
  } catch (error) {
    console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to fetch combined data" });
  }
};

export {
  seedAllDataFromApi,
  listTransactions,
  getStatistics,
  getBarChartData,
  getPieChartData,
  getCombinedData,
};
