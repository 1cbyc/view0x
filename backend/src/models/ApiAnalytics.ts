import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

interface ApiAnalyticsAttributes {
    id: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestBody?: object;
    responseBody?: object;
    errorMessage?: string;
    timestamp: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ApiAnalyticsCreationAttributes
    extends Optional<ApiAnalyticsAttributes, "id" | "createdAt" | "updatedAt"> { }

export class ApiAnalytics
    extends Model<ApiAnalyticsAttributes, ApiAnalyticsCreationAttributes>
    implements ApiAnalyticsAttributes {
    public id!: string;
    public endpoint!: string;
    public method!: string;
    public statusCode!: number;
    public responseTime!: number;
    public userId?: string;
    public ipAddress?: string;
    public userAgent?: string;
    public requestBody?: object;
    public responseBody?: object;
    public errorMessage?: string;
    public timestamp!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ApiAnalytics.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        endpoint: {
            type: DataTypes.STRING(500),
            allowNull: false,
            comment: "API endpoint path",
        },
        method: {
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: "HTTP method (GET, POST, etc.)",
        },
        statusCode: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: "HTTP status code",
        },
        responseTime: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: "Response time in milliseconds",
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: "User ID if authenticated",
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: "Client IP address",
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Client user agent string",
        },
        requestBody: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: "Request body (sanitized)",
        },
        responseBody: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: "Response body (sanitized)",
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Error message if request failed",
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: "Timestamp of the request",
        },
    },
    {
        sequelize,
        tableName: "api_analytics",
        timestamps: true,
        indexes: [
            {
                fields: ["endpoint"],
            },
            {
                fields: ["method"],
            },
            {
                fields: ["statusCode"],
            },
            {
                fields: ["userId"],
            },
            {
                fields: ["timestamp"],
            },
            {
                fields: ["endpoint", "method"],
            },
            {
                fields: ["timestamp", "endpoint"],
            },
        ],
    },
);

export default ApiAnalytics;
