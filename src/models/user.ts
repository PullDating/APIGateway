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
export default class User extends Model<User>{
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.UUID)
    id!: number;

    @AllowNull(false)
    @Column(DataType.STRING(50))
    name!: string;
    
    @AllowNull(false)
    @Column(DataType.DATE)
    birthDate!: string;

    @Column(DataType.STRING(50))
    phone!: string;

    @Column(DataType.STRING(50))
    gender!: string;

    @Column(DataType.FLOAT)
    height!: number;

    @Column(DataType.GEOGRAPHY)
    last_location!: string;

    @Column(DataType.DATE)
    last_active!: string;

    @Column(DataType.BOOLEAN)
    isActive!: boolean;

    @CreatedAt
    creation_date!: Date;

    @UpdatedAt
    updated_on!: Date;

    @DeletedAt
    deletion_date!: Date;
}