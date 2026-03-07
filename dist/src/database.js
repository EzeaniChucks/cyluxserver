"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("dotenv/config");
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const path_1 = require("path");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL ||
        "postgres://guardian_user:password@localhost:5432/guardian_eye",
    logging: false,
    entities: [(0, path_1.join)(__dirname, "entities/*.{ts,js}")],
    migrations: [(0, path_1.join)(__dirname, "migrations/*.{ts,js}")], // Add this line
    synchronize: false,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false,
});
//# sourceMappingURL=database.js.map