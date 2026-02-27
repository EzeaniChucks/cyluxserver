import "reflect-metadata";
import { DataSource } from "typeorm";
import { ChildEntity } from "./entities/Child";
import { AlertEntity } from "./entities/Alert";
import { ParentEntity } from "./entities/Parent";
import { AuditLogEntity } from "./entities/AuditLog";
import { CommandEntity } from "./entities/Command";
import { NotificationEntity } from "./entities/Notification";
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
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});
