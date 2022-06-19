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
export default class Jobs extends Model<Jobs>{
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column(DataType.STRING)
    job_name!: string;

    @Column(DataType.STRING)
    customer_id!: string;

    @Column(DataType.INTEGER)
    agent_id!: number;

    @Column(DataType.STRING)
    address!: string;

    @CreatedAt
    creation_date!: Date;

    @UpdatedAt
    updated_on!: Date;

    @DeletedAt
    deletion_date!: Date;
}
