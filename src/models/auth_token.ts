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
    Default,
} from 'sequelize-typescript';

@Table({ timestamps: true, updatedAt: false, })
export default class Auth_Token extends Model{
    //api token is unique and is the primary key
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.UUID)
    token!: string;
    //user uuid

    //But this can't work because the User entry would have to exist before this entry is generated, but this is used in the sign up process.
    //@BelongsTo( () => User) //since each uuid should be in the User table.
    @AllowNull(false)
    @Column(DataType.UUID)
    uuid!: string;

    //expiry date
    //TODO add the default expiry date logic as the default?
    @AllowNull(false)
    @Column(DataType.DATE)
    expiry!: Date;
}