import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { dbInitialize } from './db-connect';
import router from './router';
import { SERVICE_PORT } from './config';
import { Request, Response, Router } from 'express';

export const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);

app.get('/', (request: Request, response: Response) => {
    response.send('Hello World!')
})
/**app.get('/health', (request: Request, response: Response) => {
    response.status(200).send('App running').end();
});**/

dbInitialize().then(() => {
    app.listen(SERVICE_PORT);
});