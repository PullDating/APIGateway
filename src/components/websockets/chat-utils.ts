const WebSocket = require('ws');
export function noop() {};
import {SERVICE_PORT} from "../../config/vars";
//export const wss = new WebSocket.Server({SERVICE_PORT})
import {wss} from '../../app'