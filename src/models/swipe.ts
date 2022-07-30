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

//We don't need both a match and swipe table, since a match is just a successful swipe (ie another state of a swipe)

@Table({ timestamps: true })
export default class Swipe extends Model{

    //The person who was the target of the interaction (ie the person getting swiped on, matched with, blocked etc.)
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.UUID)
    target_uuid!: string;

    //The person who initated the interaction. 
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.UUID)
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

    @AllowNull(false)
    @Column(DataType.STRING)
    datingGoal!: string

    @CreatedAt
    creation_date!: Date;

    @UpdatedAt
    updated_on!: Date;

    @DeletedAt
    deletion_date!: Date;
}