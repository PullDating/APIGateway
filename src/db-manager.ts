import Account from "./models/account";


export async function addAccount(account: any) {
    await Account.create(account);
    console.log("user account created!");
}