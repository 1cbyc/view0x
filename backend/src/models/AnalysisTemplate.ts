import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
} from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";

export class AnalysisTemplate extends Model<
  InferAttributes<AnalysisTemplate>,
  InferCreationAttributes<AnalysisTemplate>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare name: string;
  declare description: CreationOptional<string>;
  declare options: object;
  declare isDefault: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare user?: User;
}

AnalysisTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: "id" },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true, len: [1, 255] },
    },
    description: {
      type: DataTypes.TEXT,
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "analysis_templates",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["user_id", "is_default"] },
      { fields: ["name"] },
    ],
  },
);
