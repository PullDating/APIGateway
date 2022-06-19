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

@Table({ timestamps: true })
export default class Customer extends Model<Customer>{
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column(DataType.STRING)
    name!: string;

    @Column(DataType.STRING)
    email!: string;

    @Column(DataType.INTEGER)
    phone_number!: number;

    @CreatedAt
    creation_date!: Date;

    @UpdatedAt
    updated_on!: Date;

    @DeletedAt
    deletion_date!: Date;
}