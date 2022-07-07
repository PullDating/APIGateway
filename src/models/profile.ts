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
export default class Profile extends Model<Profile>{
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.UUID)
    id!: string;

    @AllowNull(false)
    @Column(DataType.UUID)
    userID!: string;
    
    @AllowNull(false)
    @Column(DataType.JSONB)
    imagePath!: any;

    @AllowNull(false)
    @Column(DataType.STRING)
    datingGoal!: string;

    @AllowNull(false)
    @Column(DataType.STRING(300))
    bio!: string;

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