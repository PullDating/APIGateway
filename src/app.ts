import { dbInitialize } from './db-connect';
import { addCustomer } from './db-manager';

console.log("Hello pale blue dot.");

dbInitialize();

addCustomer({ name: "Yahya", email: "yahya@yahya.com", phone_number: 57155 });