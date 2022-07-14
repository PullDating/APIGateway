import Account from './account';
import {v4 as uuidv4} from 'uuid';
import { DateTime } from "luxon";

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
    Default,
} from 'sequelize-typescript';

@Table({ timestamps: true, updatedAt: false, })
export default class Auth_Token extends Model{
    //api token is unique and is the primary key
    @PrimaryKey
    @AllowNull(false)
    @Default(uuidv4())
    @Column(DataType.UUID)
    token!: string;


    //user uuid
    @ForeignKey(() => Account)
    @AllowNull(false)
    @Column(DataType.UUID)
    uuid!: string;

    //expiry date
    //TODO add the default expiry date logic as the default?
    @AllowNull(false)
    @Column(DataType.DATE)
    expiry!: DateTime;
}