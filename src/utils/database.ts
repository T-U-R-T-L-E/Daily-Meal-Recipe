import { Sequelize } from "sequelize-typescript";
import { config } from "../config";
import { Donation } from "../models/donation.model";

export const connection = new Sequelize({
  database: config.dbName,
  dialect: "postgres",
  username: config.dbUser,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort,
  models: [Donation],
  logging: console.log,
});

export default connection;
