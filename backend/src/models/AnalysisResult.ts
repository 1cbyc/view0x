import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

interface Vulnerability {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendations: string[];
}

export class AnalysisResult extends Model {
    public id!: number;
    public contractAddress!: string;
    public vulnerabilities!: Vulnerability[];
    public timestamp!: Date;
    public userId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

AnalysisResult.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        contractAddress: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        vulnerabilities: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id',
            },
        },
    },
    {
        sequelize,
        tableName: 'analysis_results',
    }
);

// Set up associations
AnalysisResult.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(AnalysisResult, { foreignKey: 'userId' }); 