import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { join } from "path";

export const AppDataSource = new DataSource({
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    "postgres://guardian_user:password@localhost:5432/guardian_eye",
  logging: false,
  entities: [join(__dirname, "entities/*.{ts,js}")],
  migrations: [join(__dirname, "migrations/*.{ts,js}")], // Add this line
  synchronize: false,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});
