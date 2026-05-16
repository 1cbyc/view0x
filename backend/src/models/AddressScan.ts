import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
} from "sequelize";
import { Op } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";
import { Analysis } from "./Analysis";
import type { AddressScanResult } from "../shared/types/addressScan";

export class AddressScan extends Model<
  InferAttributes<AddressScan>,
  InferCreationAttributes<AddressScan>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]> | null;
  declare address: string;
  declare chainId: number;
  declare result: AddressScanResult;
  declare analysisId: ForeignKey<Analysis["id"]> | null;
  declare shareToken: CreationOptional<string | null>;
  declare guestSessionId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static async findRecentCached(
    address: string,
    chainId: number,
    maxAgeHours = 24,
  ): Promise<AddressScan | null> {
    const since = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    return this.findOne({
      where: {
        address: address.toLowerCase(),
        chainId,
        createdAt: { [Op.gte]: since },
      },
      order: [["createdAt", "DESC"]],
    });
  }
}

AddressScan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: User, key: "id" },
      onDelete: "SET NULL",
    },
    address: {
      type: DataTypes.STRING(42),
      allowNull: false,
    },
    chainId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    analysisId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: Analysis, key: "id" },
      onDelete: "SET NULL",
    },
    shareToken: {
      type: DataTypes.STRING(80),
      allowNull: true,
      unique: true,
    },
    guestSessionId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "address_scans",
    indexes: [
      { fields: ["address", "chain_id", "created_at"] },
      { fields: ["user_id", "created_at"] },
    ],
  },
);
