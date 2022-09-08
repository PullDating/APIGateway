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
    Default,
} from 'sequelize-typescript';
//import { DataType } from 'sequelize/types';

@Table({ timestamps: true })
export default class Account extends Model{

    //unique identifier for a user within the database.
    @PrimaryKey
    @AllowNull(false)
    @Default(uuidv4())
    @Column(DataType.UUID)
    uuid!: string;
    
    //phone number is used for authentication purposes and verifying identity
    @AllowNull(false)
    @Column(DataType.STRING(50))
    phone!: string;

    //the last time that the user was active.
    @AllowNull(false)
    @Default(Date.now)
    @Column(DataType.DATE)
    last_active!: Date;

    //the state of the account.
    // 0 : just created, profile not complete & not active
    // 1 : profile created, account active
    // 2 : profile created, but account turned off (temporary) by user
    // 3 : profile created, but account deleted by user
    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    state!: number;

}