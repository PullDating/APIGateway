import Swipe from '../models/swipe';
import { DateTime } from "luxon";
const { Op } = require("sequelize");


//all functions should take in a callback, since they do database access

//this function is used to invalidate the likes and dislikes and matches (but not blocks, reports, unmatches)
//of a user, as well as any likes, matches, and dislikes aimed toward them
//this is called when someone changes their datingGoal, since they are contextual and different modes may
//have different mechanics, as well as people having different preferences for relationships from hookups, for example.
//NOTE: We may have to put in a timer so people don't abuse this to clear out their dislikes.
export async function invalidate_existing_relationships(uuid:string , callback: Function | undefined){
    //await Swipe.destroy({
    //    where: { uuid: uuid, type: { [Op.in]: [, "Jane"] }},
    //  });
}