import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    // Product title
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Product description
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Product category
    category: {
      type: String,
      required: true,
      trim: true,
    },
    // Product price
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // Whether the product is sold or not
    sold: {
      type: Boolean,
      default: false,
    },
    // Date when the product was sold
    dateOfSale: {
      type: Date,
      require: true,
    },
    // Image URL or path
    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

export default mongoose.model("Transaction", transactionSchema);
