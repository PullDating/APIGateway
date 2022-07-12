import { Request, Response, Router } from 'express';

import { addAccount } from './db-manager';

const router = Router();

router.get('/health', (request: Request, response: Response) => {
    response.status(200).send('App running').end();
});

router.post('/add-user', addUserController);

async function addUserController(request: Request, response: Response) {
    const customerInfo = request.body;
    // USE JOI SCHEMA VALIDATION
    try {
        await addAccount(customerInfo);
        console.log('Customer added succesfully!');
        return response.status(200).send('Customer added succesfully!').end();
    } catch (e) {
        console.error(`Error adding customer: ${e}`);
        return response.status(500).send().end();
    }

}
export default router;