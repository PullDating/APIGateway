import { allowedNodeEnvironmentFlags } from 'process';
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

@Table({ timestamps: true})
export default class Chat extends Model{
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.STRING)
    room_id!: string;

    @AllowNull(false)
    @Column(DataType.JSONB)
    log!: any;
}