import { EndPointBuilder } from './internal/endpoint-builder';
import { DbHelperModel, ModelMigration, QueryConnector, QueryManager, DbHelperModuleConfig } from 'ts-db-helper';
import { RouteConfigurator } from './configurators/route.configurator';
import { Observable } from 'rxjs/Observable';
import { IUser } from './interface/user.interface';
import { IUserModel } from './interface/user-model.interface';
import { IPermissionFilter } from './interface/permission-filter.interface';
import { IAuthenticator } from './interface/authenticator.interface';
import { INamespace } from './interface/namespace.interface';
import { IAuthPermission } from './interface/auth-permission.interface';
import { EndPointConfigurator } from './configurators/end-point.configurator';
import { RouteManager } from './managers/route.manager';
import { ViewSet } from './base/viewset';
import { IsAutenticatedPermission } from './security/permissions/is-authenticated.permission';
import { Log } from './internal/log';
import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';

import 'rxjs/add/operator/finally';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/Observable/empty';

const Express = express;

// Creates and configures an ExpressJS web server.
export abstract class TsRestFrameworkApp {
    private static methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'connect', 'trace', 'all'];
    private pathBase = '/';

    private dbConfig: DbHelperModuleConfig;

    // ref to Express instance
    public express: express.Application;

    // Run configuration methods on the Express instance.
    constructor() {
        this.express = Express();
    }

    // Configure Express middleware.
    private middleware(): void {
        this.express.use((req: express.Request, resp: express.Response, next: Function) => {
            // log things
            next();
        });
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: false }));
    }

    public setAuthenticator(method: string, authPath: string, authenticator: IAuthenticator) {
        if (authenticator && authPath) {
            const authRouter = express.Router();
            authRouter.use(bodyParser.json());
            authRouter.use(bodyParser.urlencoded({ extended: false }));
            if (TsRestFrameworkApp.methods.indexOf(method.toLowerCase()) !== -1) {
                (authRouter as any)[method]('/', (req: express.Request, resp: express.Response, next: express.NextFunction) => {
                    authenticator.authenticate(req, resp, EndPointBuilder.userModel);
                });
            } else {
                throw new Error('Try to add auth point with unknown method value: ' + method);
            }
            this.express.use(authPath, authRouter);
        }

        if (authenticator && authenticator.authFilter) {
            EndPointBuilder.authFilters.push(authenticator.authFilter);
        }

        EndPointBuilder.defaultAuthPermission = new IsAutenticatedPermission();
    }

    private setDefaultAuthPermission(authPermission: IAuthPermission) {
        EndPointBuilder.defaultAuthPermission = authPermission;
    }

    private setDefaultPermissionFilter(permissionFilter: IPermissionFilter) {
        EndPointBuilder.defaultPermissionFilter = permissionFilter;
    }

    public setUserModel(userModel: IUserModel) {
        EndPointBuilder.userModel = userModel;
    }

    public setPathBase(base: string) {
        this.pathBase = base;
        if (this.pathBase[0] !== '/') {
            this.pathBase = '/' + this.pathBase;
        }
    }

    public setDbConfig(config: DbHelperModuleConfig) {
        this.dbConfig = config;
    }

    // Configure API endpoints.
    public import(view: {new(): INamespace|ViewSet<any>}, parentPath = this.pathBase): TsRestFrameworkApp {
        if (RouteManager.getInstance().isRegisteredNamespace(view)) {
            this.importNamespace(view as {new(): INamespace}, this.pathBase);
        } else if (RouteManager.getInstance().isRegisteredViewset(view)) {
            this.importViewset(view as {new(): ViewSet<any>}, this.pathBase);
        } else {
            throw new Error('"' + view.name + '" is not registered did you miss "@Namespace" or "@Route" annotation ?');
        }
        return this;
    }

    private importViewset(mViewset: {new(): ViewSet<any>}, parentPath: string) {
        const bundle = RouteManager.getInstance().getRouteBundle(mViewset);
        if (!bundle) {
            throw new Error('ViewSet "' + mViewset.name + '" has no configuration, did you miss "@Route" decorator on this ViewSet ?');
        }
        const router = express.Router();
        const routePath = this.appendPath(parentPath, bundle.config.path);
        if (bundle.config.middlewares && bundle.config.middlewares.length) {
            for (const requestHandler of bundle.config.middlewares) {
                router.use(requestHandler);
            }
        } else {
            router.use(bodyParser.json());
            router.use(bodyParser.urlencoded({ extended: false }));
        }
        for (const key in bundle.routes) {
            if (bundle.routes.hasOwnProperty(key)) {
                const endPointConfig =  bundle.routes[key];
                this.addRoute(mViewset, key, bundle.config, endPointConfig, router);
            }
        }
        this.express.use(routePath, router);
    }

    private addRoute(mViewset: { new(): ViewSet<DbHelperModel>}, key: string, routeConfig: RouteConfigurator,
            endPointConfig: EndPointConfigurator, router: express.Router) {
        if (!endPointConfig.path || endPointConfig.path[0] !== '/') {
            endPointConfig.path = '/' + endPointConfig.path;
        }
        endPointConfig.method = endPointConfig.method || 'get';
        const endPoint = EndPointBuilder.build(mViewset, key, routeConfig, endPointConfig, router);
        if (TsRestFrameworkApp.methods.indexOf(endPointConfig.method!.toLowerCase()) !== -1) {
            (router as {[index: string]: any})[endPointConfig.method!](endPointConfig.path, endPoint);
        } else {
            throw new Error('Try to add end point with unknown method');
        }
    }

    private importNamespace(mNamespace: {new(): INamespace}, parentPath: string) {
        const namespaceConfig = RouteManager.getInstance().getNamespaceConfiguration(mNamespace);
        namespaceConfig.path = namespaceConfig.path || '';
        const childPath = this.appendPath(parentPath, namespaceConfig.path);
        for (const view of namespaceConfig.views) {
            this.import(view, childPath);
        }
    }

    private appendPath(parentPath: string, childPath: string): string {
        let completePath: string;
        if (!childPath) {
            completePath = parentPath;
        } else if (parentPath[parentPath.length - 1] === '/' && childPath[0] === '/') {
            completePath = parentPath + childPath.substr(1, childPath.length);
        } else if (parentPath[parentPath.length - 1] === '/' || childPath[0] === '/') {
            completePath = parentPath + childPath;
        } else {
            completePath = parentPath + '/' + childPath;
        }
        return completePath;
    }

    public start() {
        QueryManager.init(this.dbConfig);
        const port = normalizePort(process.env.PORT || 3000);
        this.express.set('port', port);

        const server = http.createServer(this.express);
        server.listen(port);
        server.on('error', onError);
        server.on('listening', onListening);

        function normalizePort(val: number|string): number|string|boolean {
            const nPort: number = (typeof val === 'string') ? parseInt(val, 10) : val;
            if (isNaN(nPort)) {
                return val;
            } else if (nPort >= 0) {
                return nPort;
            } else {
                return false;
            }
        }

        function onError(error: NodeJS.ErrnoException): void {
            if (error.syscall !== 'listen') {throw error; }
            const bind = (typeof port === 'string') ? 'Pipe ' + port : 'Port ' + port;
            switch (error.code) {
                case 'EACCES':
                Log.e(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
                case 'EADDRINUSE':
                Log.e(`${bind} is already in use`);
                process.exit(1);
                break;
                default:
                throw error;
            }
        }

        function onListening(): void {
            const addr = server.address();
            const bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
            Log.i(`Listening on ${bind}`);
        }
    }
}
