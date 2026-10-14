import { createTableServer } from './socket';
createTableServer().listen(3001, '127.0.0.1', () => console.log('Twinleaf tabletop server: http://127.0.0.1:3001'));
