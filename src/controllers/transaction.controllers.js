import axios from "axios";
import Transaction from "../models/transaction.models.js";
import { SEED_THIRD_PARTY_URI as apiUrl } from "../constants.js";

//  Run only once to seed data
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
  let finalQuery = {
    $expr: {
      $eq: [{ $month: "$dateOfSale" }, Number(month)],
    },
  };

  // If searchText is provided and not empty/whitespace
  if (searchText && searchText.trim() !== "") {
    let textSearchQuery = {
      $or: [
        { title: { $regex: searchText.trim(), $options: "i" } },
        { description: { $regex: searchText.trim(), $options: "i" } },
      ],
    };

    const numberSearch = parseFloat(searchText.trim());
    if (!isNaN(numberSearch)) {
      textSearchQuery.$or.push({ price: numberSearch });
    }

    // Combine finalQuery and textSearchQuery using $and
    finalQuery = {
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

  // Validate month number
  if (!isValidMonth(selectedMonth)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  // Parse and validate page and perPage values
  page = parseInt(page);
  perPage = parseInt(perPage);
  if (isNaN(page) || isNaN(perPage) || page <= 0 || perPage <= 0) {
    return res.status(400).json({ message: "Invalid pagination parameters" });
  }

  // Calculate skip value for pagination
  const skip = (page - 1) * perPage;

  // Construct MongoDB query
  const query = constructQuery(selectedMonth, searchText);

  try {
    // Fetch transactions based on query, skip and limit
    const transactions = await Transaction.find(query)
      .skip(skip)
      .limit(perPage);

    // Count total records based on query
    const totalRecords = await Transaction.countDocuments(query);

    // Calculate total pages based on total records and perPage
    const totalPages = Math.ceil(totalRecords / perPage);

    res.json({
      totalRecords,
      totalPages,
      currentPage: page,
      perPage,
      data: transactions,
    });
  } catch (error) {
    // console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to list transactions" });
  }
};

const getStatistics = async (req, res) => {
  const { month: monthNumber } = req.query;

  // Validate month number if provided
  if (!isValidMonth(monthNumber)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  try {
    // Calculate total records
    // const totalRecords = await Transaction.countDocuments();

    // Calculate total sold records for the specified month (month mandetory)
    const totalSoldRecords = await Transaction.aggregate([
      {
        $match: {
          $and: [
            {
              $expr: {
                $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)],
              },
            },
            {
              sold: true,
            },
          ],
        },
      },
    ]);

    // Calculate total not sold records for the specified month
    const totalNotSoldRecords = await Transaction.aggregate([
      {
        $match: {
          $and: [
            {
              $expr: {
                $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)],
              },
            },
            {
              sold: false,
            },
          ],
        },
      },
    ]);

    // Calculate total sale amount for the specified month
    const totalSaleAmount = await Transaction.aggregate([
      {
        $match: {
          _id: {
            $in: totalSoldRecords.map((record) => record._id),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSum: { $sum: "$price" },
        },
      },
    ]);

    res.json({
      totalSaleAmount:
        totalSaleAmount.length > 0 ? totalSaleAmount[0].totalSum : 0,
      totalSoldItems: totalSoldRecords.length,
      totalNotSoldItems: totalNotSoldRecords.length,
    });
  } catch (error) {
    // console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
};

const getBarChartData = async (req, res) => {
  const { month: monthNumber } = req.query;

  // Validate month number if provided
  if (monthNumber && !isValidMonth(monthNumber)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  try {
    // Define all price ranges
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

    // Match transactions based on the month if provided
    const matchQuery = monthNumber
      ? {
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)],
          },
        }
      : {};

    // Group transactions by price range and count the number of items in each range
    const barChartData = await Transaction.aggregate([
      {
        $match: matchQuery,
      },
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

    // Create an object with price range as key and count as value
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

  // Validate month number if provided
  if (monthNumber && !isValidMonth(monthNumber)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  try {
    // Match transactions based on the month if provided
    const matchQuery = monthNumber
      ? {
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, Number(monthNumber)],
          },
        }
      : {};

    // Group transactions by category and count the number of items in each category
    const categoryData = await Transaction.aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: "$category", // Group by category
          count: { $sum: 1 }, // Count number of items in each category
        },
      },
    ]);

    // Format data for pie chart
    const formattedData = categoryData.map((item) => ({
      category: item._id,
      count: item.count,
    }));

    res.json(formattedData);
  } catch (error) {
    // console.error("ERROR: ", error);
    res.status(500).json({ message: "Failed to fetch pie chart data" });
  }
};

const getCombinedData = async (req, res) => {
  const { month: monthNumber } = req.query;

  // Validate month number provided
  if (!isValidMonth(monthNumber)) {
    return res.status(400).json({ message: "Invalid month number" });
  }

  try {
    const domain = "http://localhost:9000/api/v1";

    // Fetch data from all three APIs concurrently
    const [statisticsResponse, barChartResponse, pieChartResponse] =
      await Promise.all([
        axios.get(`${domain}/statistics?month=${monthNumber}`),
        axios.get(`${domain}/bar-chart-data?month=${monthNumber}`),
        axios.get(`${domain}/pie-chart-data?month=${monthNumber}`),
      ]);

    // Destructure data from responses
    const statisticsData = statisticsResponse.data;
    const barChartData = barChartResponse.data;
    const pieChartData = pieChartResponse.data;

    const combinedData = {
      barChartData,
      pieChartData,
      statisticsData,
    };

    res.json(combinedData);
  } catch (error) {
    // Detailed error handling and logging
    console.error("ERROR: ", error);

    if (error.isAxiosError) {
      if (error.response) {
        console.error("Error Response Status:", error.response.status);
        console.error("Error Response Data:", error.response.data);
      } else if (error.request) {
        console.error("Error Request:", error.request);
      } else {
        console.error("Error Message:", error.message);
      }
    }

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
