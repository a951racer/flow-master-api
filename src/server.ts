import { config } from "./config/env";
import { connectDB } from "./config/db";
import app from "./app";

async function start(): Promise<void> {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });
}

start();
