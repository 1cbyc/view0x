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

export class ActivityLog extends Model<
  InferAttributes<ActivityLog>,
  InferCreationAttributes<ActivityLog>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare action: string;
  declare resourceType: string;
  declare resourceId: CreationOptional<string>;
  declare details: CreationOptional<object>;
  declare ipAddress: CreationOptional<string>;
  declare userAgent: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;

  declare user?: User;
}

ActivityLog.init(
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
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },
    resourceType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true, len: [1, 50] },
    },
    resourceId: {
      type: DataTypes.UUID,
    },
    details: {
      type: DataTypes.JSONB,
    },
    ipAddress: {
      type: DataTypes.STRING,
    },
    userAgent: {
      type: DataTypes.TEXT,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "activity_logs",
    timestamps: false,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["action"] },
      { fields: ["resource_type"] },
      { fields: ["created_at"] },
      { fields: ["user_id", "created_at"] },
    ],
  },
);
