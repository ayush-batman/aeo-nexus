import { httpRouter } from 'convex/server';

import { pendingHttp, recordHttp } from './layaAnnotations';
import { authComponent, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({ path: '/laya/pending', method: 'GET', handler: pendingHttp });
http.route({ path: '/laya/annotations', method: 'POST', handler: recordHttp });

export default http;
