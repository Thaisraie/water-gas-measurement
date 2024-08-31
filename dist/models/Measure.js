"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../database"));
var MeasureType;
(function (MeasureType) {
    MeasureType["Water"] = "WATER";
    MeasureType["Gas"] = "GAS";
})(MeasureType || (MeasureType = {}));
class Measure extends sequelize_1.Model {
}
Measure.init({
    measure_uuid: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        unique: true,
    },
    customer_code: {
        type: sequelize_1.DataTypes.STRING(36),
        allowNull: false,
    },
    measure_datetime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    measure_type: {
        type: sequelize_1.DataTypes.STRING(5),
        allowNull: false,
    },
    has_confirmed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
    },
    measure_value: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    image_file: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize: database_1.default,
    tableName: "measure",
});
exports.default = Measure;
