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
export default class Account extends Model<Account>{

    //unique identifier for a user within the database.
    @PrimaryKey
    @AllowNull(false)
    @Default(DataType.UUID)
    @Column(DataType.UUID)
    uuid!: string;
    
    //phone number is used for authentication purposes and verifying identity
    @AllowNull(false)
    @Column(DataType.STRING(50))
    get phone(): string {
        return this.getDataValue('phone');
    }
    set phone(value: string) {
        this.setDataValue('phone', value);
    }

    //the state of the account.
    // 0 : just created, profile not complete & not active
    // 1 : profile created, account active
    // 2 : profile created, but account turned off (temporary) by user
    // 3 : profile created, but account deleted by user
    @AllowNull(false)
    @Default(0)
    @Column(DataType.NUMBER)
    state!: number;

    //timestamp the account was created 
    @CreatedAt
    @AllowNull(false)
    creation_date!: Date;

    //timestamp the account was updated
    @UpdatedAt
    @AllowNull(false)
    updated_on!: Date;

    //timestamp the account was deleted (if it was deleted).
    @DeletedAt
    @AllowNull(true)
    deletion_date!: Date;
}