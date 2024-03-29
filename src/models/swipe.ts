import { allowedNodeEnvironmentFlags } from 'process';
import {v4 as uuidv4} from 'uuid';
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
    Default
} from 'sequelize-typescript';
import { Json } from 'sequelize/types/utils';

//We don't need both a match and swipe table, since a match is just a successful swipe (ie another state of a swipe)

@Table({ timestamps: true })
export default class Swipe extends Model{

    //just a unique id for the swipe
    @PrimaryKey
    @AllowNull(false)
    @Default(uuidv4())
    @Column(DataType.UUID)
    swipe_id!: string;

    //The person who was the target of the interaction (ie the person getting swiped on, matched with, blocked etc.)
    @AllowNull(false)
    @Column({type: DataType.UUID})
    target_uuid!: string;

    //The person who initated the interaction. 
    @AllowNull(false)
    @Column({type: DataType.UUID})
    uuid!: string;

    //Represents the state of the interaction between two people
    // 0 : dislike
    // 1 : like
    // 2 : match
    // 3 : unmatch
    // 4 : block

    //may need to add more based on stats we received as feedback. 
    @AllowNull(false)
    @Column(DataType.INTEGER)
    type!: number;

    @CreatedAt
    creation_date!: Date;

    @UpdatedAt
    updated_on!: Date;

    @DeletedAt
    deletion_date!: Date;
}