import { Sequelize } from 'sequelize';

require('dotenv').config()

const sequelize = new Sequelize(`${process.env.DATABASE}`, `${process.env.USER}`, `${process.env.PASSWORD}`, {
  host: `${process.env.HOST}`,
  dialect: 'postgres',
  port: process.env.PORT as number | undefined,
  logging: false,
});

export default sequelize;