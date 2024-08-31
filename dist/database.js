"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
require('dotenv').config();
const sequelize = new sequelize_1.Sequelize(`${process.env.DATABASE}`, `${process.env.USER}`, `${process.env.PASSWORD}`, {
    host: `${process.env.HOST}`,
    dialect: 'postgres',
    port: process.env.PORT,
    logging: false,
});
exports.default = sequelize;
