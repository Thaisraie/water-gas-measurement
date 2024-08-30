import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

enum MeasureType {
  Water = 'WATER',
  Gas = 'GAS'
}

interface MeasureAttributes {
  measure_uuid: string;
  customer_code: string;
  measure_datetime: Date;
  measure_type: MeasureType;
  has_confirmed: boolean;
  measure_value: number;
  image_url: string;
}

interface MeasureCreationAttributes extends Optional<MeasureAttributes, 'measure_uuid'> {}

class Measure extends Model<MeasureAttributes, MeasureCreationAttributes> implements MeasureAttributes {
  public measure_uuid!: string;
  public customer_code!: string;
  public measure_datetime!: Date;
  public measure_type!: MeasureType;
  public has_confirmed!: boolean;
  public measure_value!: number;
  public image_url!: string;
}

Measure.init({
  measure_uuid: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    unique: true,
  },
  customer_code: {
    type: DataTypes.STRING(36),
    allowNull: false,
  },
  measure_datetime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  measure_type: {
    type: DataTypes.STRING(5),
    allowNull: false,
  },
  has_confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  measure_value: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'measure',
});

export default Measure;