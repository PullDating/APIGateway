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
    Default
} from 'sequelize-typescript';
import { Json } from 'sequelize/types/utils';
import { DateTime } from "luxon";

@Table({ timestamps: true })
export default class Profile extends Model{

    //the uuid identifies the record as belonging to a specific user.
    @PrimaryKey
    @ForeignKey(() => Account)
    @AllowNull(false)
    @Column(DataType.UUID)
    uuid!: string;
    
    //the name of the user
    @AllowNull(false)
    @Column(DataType.STRING(50))
    name!: string;

    //the birthdate of the person, used to find the age
    @AllowNull(false)
    @Column(DataType.DATE)
    birthDate!: DateTime;

    //the gender of the user
    @AllowNull(false)
    @Column(DataType.STRING(50))
    gender!: string;

    //the height of the user
    @AllowNull(false)
    @Column(DataType.FLOAT)
    height!: number;

    //this points to the image paths within the Minio image store.
    //will contain the bucket name, and then the image paths, with the key being the order index.
    @AllowNull(false)
    @Column(DataType.JSONB)
    imagePath!: any;

    //holds the dating goal of the user
    @AllowNull(false)
    @Column(DataType.STRING)
    datingGoal!: string;

    //stores the biography written by the user
    @AllowNull(false)
    @Column(DataType.STRING(300))
    biography!: string;

    //stores the body type of the user
    @AllowNull(false)
    @Column(DataType.STRING)
    bodyType!: string;

    //the most recent location of the user
    @AllowNull(false)
    @Column(DataType.GEOMETRY) //geometry because we are using a 2d plane.
    lastLocation!: any;

    //time the profile entry was created
    @CreatedAt
    creation_date!: Date;

    //time the profile entry was updated
    @UpdatedAt
    updated_on!: Date;

    //not sure if this is necessary, because you can't delete a profile without deleting an account. 
    @DeletedAt
    deletion_date!: Date;
}

