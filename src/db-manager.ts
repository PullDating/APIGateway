import Customer from './models/customer'


export async function addCustomer(customer: any) {
    await Customer.create(customer);
    console.log("user created!");
}