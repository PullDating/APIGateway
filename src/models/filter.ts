import {
    Column,
    Table,
    Model,
    DataType,
    CreatedAt,
    DeletedAt,
    UpdatedAt,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    AllowNull,
} from 'sequelize-typescript';
import { Json } from 'sequelize/types/utils';

@Table({ timestamps: true })
export default class Filter extends Model<Filter>{
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.UUID)
    id!: string;

    @AllowNull(false)
    @Column(DataType.UUID)
    userID!: string;
    
    @AllowNull(false)
    @Column(DataType.INTEGER)
    age!: number;

    @AllowNull(false)
    @Column(DataType.FLOAT)
    height!: number;

    @AllowNull(false)
    @Column(DataType.INTEGER)
    distance!: number;

    @AllowNull(false)
    @Column(DataType.STRING)
    religion!: string;

    @CreatedAt
    creation_date!: Date;

    @UpdatedAt
    updated_on!: Date;

    @DeletedAt
    deletion_date!: Date;
}