import dotenv from "dotenv";

dotenv.config();

export interface Config {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  nodeEnv: string;
}

const requiredVars = ["MONGODB_URI", "PORT", "JWT_SECRET"] as const;

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

export const config: Config = {
  port: parseInt(process.env.PORT as string, 10),
  mongodbUri: process.env.MONGODB_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
