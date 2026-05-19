import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { Op } from "sequelize";
import { sequelize } from "../config/database";

export type RektIncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RektIncidentStatus =
  | "confirmed"
  | "disputed"
  | "recovered"
  | "partial_recovery";

export type RektAddress = {
  label: string;
  address: string;
  chain?: string;
  role?: string;
};

export type RektTransaction = {
  label: string;
  hash: string;
  chain?: string;
  url?: string;
};

export class RektIncident extends Model<
  InferAttributes<RektIncident>,
  InferCreationAttributes<RektIncident>
> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare projectName: string;
  declare title: string;
  declare incidentDate: Date;
  declare disclosedAt: CreationOptional<Date | null>;
  declare amountLostUsd: CreationOptional<string | null>;
  declare amountRecoveredUsd: CreationOptional<string | null>;
  declare severity: RektIncidentSeverity;
  declare status: RektIncidentStatus;
  declare chains: string[];
  declare categories: string[];
  declare attackTypes: string[];
  declare auditorNames: CreationOptional<string[]>;
  declare summary: string;
  declare rootCause: CreationOptional<string | null>;
  declare technicalDetails: CreationOptional<string | null>;
  declare remediation: CreationOptional<string | null>;
  declare affectedAddresses: CreationOptional<RektAddress[]>;
  declare transactionHashes: CreationOptional<RektTransaction[]>;
  declare sourceUrls: CreationOptional<string[]>;
  declare tags: CreationOptional<string[]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static buildWhere(params: {
    q?: string;
    chain?: string;
    category?: string;
    attackType?: string;
    auditor?: string;
    severity?: string;
    status?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: any = {};

    if (params.q) {
      const like = `%${params.q}%`;
      where[Op.or] = [
        { projectName: { [Op.iLike]: like } },
        { title: { [Op.iLike]: like } },
        { summary: { [Op.iLike]: like } },
        { rootCause: { [Op.iLike]: like } },
      ];
    }
    if (params.chain) where.chains = { [Op.contains]: [params.chain] };
    if (params.category) where.categories = { [Op.contains]: [params.category] };
    if (params.attackType) {
      where.attackTypes = { [Op.contains]: [params.attackType] };
    }
    if (params.auditor) {
      where.auditorNames = { [Op.contains]: [params.auditor] };
    }
    if (params.severity) where.severity = params.severity.toUpperCase();
    if (params.status) where.status = params.status;
    if (params.from || params.to) {
      where.incidentDate = {
        ...(params.from ? { [Op.gte]: params.from } : {}),
        ...(params.to ? { [Op.lte]: params.to } : {}),
      };
    }

    return where;
  }
}

RektIncident.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
    },
    projectName: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(220),
      allowNull: false,
    },
    incidentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "incident_date",
    },
    disclosedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "disclosed_at",
    },
    amountLostUsd: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true,
      field: "amount_lost_usd",
    },
    amountRecoveredUsd: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true,
      field: "amount_recovered_usd",
    },
    severity: {
      type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
      allowNull: false,
      defaultValue: "HIGH",
    },
    status: {
      type: DataTypes.ENUM("confirmed", "disputed", "recovered", "partial_recovery"),
      allowNull: false,
      defaultValue: "confirmed",
    },
    chains: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    categories: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    attackTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      field: "attack_types",
    },
    auditorNames: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      field: "auditor_names",
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rootCause: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "root_cause",
    },
    technicalDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "technical_details",
    },
    remediation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    affectedAddresses: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "affected_addresses",
    },
    transactionHashes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "transaction_hashes",
    },
    sourceUrls: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
      field: "source_urls",
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "rekt_incidents",
    indexes: [
      { unique: true, fields: ["slug"] },
      { fields: ["incident_date"] },
      { fields: ["amount_lost_usd"] },
      { fields: ["severity"] },
      { using: "gin", fields: ["chains"] },
      { using: "gin", fields: ["categories"] },
      { using: "gin", fields: ["attack_types"] },
    ],
  },
);
