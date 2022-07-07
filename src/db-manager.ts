import User from "./models/user";


export async function addUser(user: any) {
    await User.create(user);
    console.log("user created!");
}