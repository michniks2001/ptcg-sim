// Isolated test entrypoint; production never imports fixtures.
import { createTableServer } from '../../server/socket';
import { fixture } from '../fixtures';
createTableServer((request,options) => fixture(/(?:^|; )table-fixture=([^;]+)/.exec(request.headers.cookie || '')?.[1] || '',options)).listen(3002, '127.0.0.1');
