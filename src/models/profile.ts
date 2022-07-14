import User from './account';

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

@Table({ timestamps: true })
export default class Profile extends Model{

    //the uuid identifies the record as belonging to a specific user.
    @PrimaryKey
    @BelongsTo(() => User)
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
    birthDate!: string;

    //the gender of the user
    @AllowNull(false)
    @Column(DataType.STRING(50))
    gender!: string;

    //the height of the user
    @AllowNull(false)
    @Column(DataType.FLOAT)
    height!: number;

    //this points to the image paths within the Minio image store.
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
    bio!: string;

    //stores the body type of the user
    @AllowNull(false)
    @Column(DataType.STRING)
    bodyType!: string;

    //holds the religion of the user
    @AllowNull(false)
    @Column(DataType.STRING)
    religion!: string;

    //the most recent location of the user
    @AllowNull(false)
    @Column(DataType.GEOGRAPHY)
    last_location!: string;

    //the last time that the user was active.
    @AllowNull(false)
    @Default(Date.now)
    @Column(DataType.DATE)
    last_active!: string;

    //whether the user is currently active or not
    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive!: boolean;    

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