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
    id!: string;

    @AllowNull(false)
    @Column(DataType.STRING(50))
    name!: string;
    
    @AllowNull(false)
    @Column(DataType.DATE)
    birthDate!: string;

    @AllowNull(false)
    @Column(DataType.STRING(50))
    get phone(): string {
        return this.getDataValue('phone');
    }
    set phone(value: string) {
        this.setDataValue('phone', value);
    }

    @AllowNull(false)
    @Column(DataType.STRING(50))
    gender!: string;

    @AllowNull(false)
    @Column(DataType.FLOAT)
    height!: number;

    @AllowNull(false)
    @Column(DataType.GEOGRAPHY)
    last_location!: string;

    @AllowNull(false)
    @Column(DataType.DATE)
    last_active!: string;

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    isActive!: boolean;

    @CreatedAt
    creation_date!: Date;

    @UpdatedAt
    updated_on!: Date;

    @DeletedAt
    deletion_date!: Date;
}