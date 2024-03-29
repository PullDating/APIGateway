import Account from './account';

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
    BelongsTo,
} from 'sequelize-typescript';
import { Json } from 'sequelize/types/utils';
import { DateTime } from 'luxon';

@Table({ timestamps: true})
export default class Filter extends Model{
    @PrimaryKey
    @AllowNull(false)
    @ForeignKey(() => Account)
    @Column(DataType.UUID)
    uuid!: string;
    
    //age related

    @AllowNull(false)
    @Column(DataType.INTEGER)
    minAge!: number;

    @AllowNull(false)
    @Column(DataType.INTEGER)
    maxAge!: number;

    //height related

    @AllowNull(false)
    @Column(DataType.FLOAT)
    minHeight!: number;

    @AllowNull(false)
    @Column(DataType.FLOAT)
    maxHeight!: number;

    //gender related

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    genderMan!: boolean

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    genderWoman!: boolean

    @AllowNull(true)
    @Column(DataType.BOOLEAN)
    genderNonBinary!: boolean

    //bt stands for bodytype

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    btLean!: boolean

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    btAverage!: boolean

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    btMuscular!: boolean

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    btHeavy!: boolean

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    btObese!: boolean

    //location

    @AllowNull(false)
    @Column(DataType.FLOAT)
    maxDistance!: number

    //autogenerated (Do not modify manually)

    @CreatedAt
    creation_date!: Date;

    @UpdatedAt
    updated_on!: Date;

    @DeletedAt
    deletion_date!: Date;
}