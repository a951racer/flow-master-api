import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config/env";
import { errorHandler } from "./middleware/error-handler";

import authRouter from "./routes/auth.routes";
import expenseCategoryRouter from "./routes/expense-category.routes";
import paymentSourceRouter from "./routes/payment-source.routes";
import expenseRouter from "./routes/expense.routes";
import incomeRouter from "./routes/income.routes";
import periodRouter from "./routes/period.routes";
import periodExpenseRouter from "./routes/period-expense.routes";
import periodIncomeRouter from "./routes/period-income.routes";

const app = express();

// Security headers
app.use(helmet());

// Request logging
const morganFormat = config.nodeEnv === "development" ? "dev" : "combined";
app.use(morgan(morganFormat));

// Body parsing
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/expense-categories", expenseCategoryRouter);
app.use("/api/payment-sources", paymentSourceRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/incomes", incomeRouter);
app.use("/api/periods", periodRouter);
app.use("/api/period-expenses", periodExpenseRouter);
app.use("/api/period-incomes", periodIncomeRouter);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ status: 404, message: "Route not found" });
});

// Centralized error handler
app.use(errorHandler);

export default app;
