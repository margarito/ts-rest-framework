import { DbHelperModuleConfig } from 'ts-db-helper/src/core/db-helper-module-config';
import { DbHelperModel, ModelMigration, QueryConnector, QueryManager } from 'ts-db-helper';
import { Observer } from 'rxjs/Rx';
import { RouteConfigurator } from './configurators/route.configurator';
import { Observable } from 'rxjs/Observable';
import { IUser } from './interface/user.interface';
import { IUserModel } from './interface/user-model.interface';
import { IAuthFilter } from './interface/auth-filter.interface';
import { IPermissionFilter } from './interface/permission-filter.interface';
import { IAuthenticator } from './interface/authenticator.interface';
import { INamespace } from './interface/namespace.interface';
import { IAuthPermission } from './interface/auth-permission.interface';
import { EndPointConfigurator } from './configurators/end-point.configurator';
import { RouteManager } from './managers/route.manager';
import { ViewSet } from './base/viewset';
import { TRFRequest } from './interface/request.interface';
import { IsAutenticatedPermission } from './security/permissions/is-authenticated.permission';
import { PermissionResult } from './public-api/permission-result';
import { AuthFilterError } from './errors/auth-filter.error';
import * as path from 'path';
import * as express from 'express';
import logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import debug from 'debug';

import 'rxjs/add/operator/finally';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/Observable/empty';

const Express = express;

// Creates and configures an ExpressJS web server.
export abstract class TsRestFrameworkApp {
    private static methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'connect', 'trace', 'all'];
    private pathBase = '/';
    private userModel: IUserModel;
    private authFilters = <IAuthFilter[]>[];
    private defaultAuthPermission: IAuthPermission;
    private defaultPermissionFilter: IPermissionFilter;
    private dbConfig: DbHelperModuleConfig;

    // ref to Express instance
    public express: express.Application;

    // Run configuration methods on the Express instance.
    constructor() {
        this.express = Express();
    }

    // Configure Express middleware.
    private middleware(): void {
        this.express.use(logger('dev'));
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
                    authenticator.authenticate(req, resp, this.userModel);
                });
            } else {
                throw new Error('Try to add auth point with unknown method value: ' + method);
            }
            this.express.use(authPath, authRouter);
        }

        if (authenticator && authenticator.authFilter) {
            this.authFilters.push(authenticator.authFilter);
        }

        this.defaultAuthPermission = new IsAutenticatedPermission();
    }

    private setDefaultAuthPermission(authPermission: IAuthPermission) {
        this.defaultAuthPermission = authPermission;
    }

    private setDefaultPermissionFilter(permissionFilter: IPermissionFilter) {
        this.defaultPermissionFilter = permissionFilter;
    }

    public setUserModel(userModel: IUserModel) {
        this.userModel = userModel;
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
        console.info('add route: ' + routePath);
        for (const key in bundle.routes) {
            if (Object.getOwnPropertyDescriptor(mViewset, key)) {
                const endPointConfig =  bundle.routes[key];
                this.addRoute(mViewset, key, bundle.config, endPointConfig, router);
            } else {
                throw new Error('"' + key + '" is not a method of "' + mViewset.name + '"');
            }
        }
        this.express.use(routePath, router);
    }

    private callEndPointAuthFilter(req: express.Request, routeConfig: RouteConfigurator,
            endPointConfig: EndPointConfigurator): Observable<IUser> {
        let authFilters = <IAuthFilter[]>[];
        const authFilter = endPointConfig.authFilter || routeConfig.authFilter;
        if (authFilter) {
            authFilters.push(authFilter);
        }
        if (authFilters.length === 0) {authFilters = authFilters.concat(this.authFilters); }
        if (routeConfig.addAuthFilters) {authFilters = authFilters.concat(routeConfig.addAuthFilters); }
        if (endPointConfig.addAuthFilters) {authFilters = authFilters.concat(endPointConfig.addAuthFilters); }
        if (authFilters.length === 0) {
            return Observable.empty();
        } else {
            return this.scanAuthFilters(req, authFilters, 0);
        }
    }

    private scanAuthFilters(req: express.Request, authFilters: IAuthFilter[], index: number): Observable<IUser> {
        return authFilters[index].filter(req, this.userModel).switchMap((user: IUser) => {
            if (!user && index < authFilters.length - 1) {
                return this.scanAuthFilters(req, authFilters, index + 1);
            } else {
                return Observable.create((observer: Observer<IUser>) => {
                    observer.next(user);
                    observer.complete();
                });
            }
        });
    }

    private callAuthPermissions(req: express.Request, routeConfig: RouteConfigurator,
            endPointConfig: EndPointConfigurator): Observable<PermissionResult> {
        const authPermission = endPointConfig.authPermission || routeConfig.authPermission || this.defaultAuthPermission;
        if (authPermission) {
            return authPermission.check(req, this.userModel);
        } else {
            return Observable.create((observer: Observer<PermissionResult>) => {
                observer.next(new PermissionResult(true));
                observer.complete();
            });
        }
    }

    private callPermissions(req: TRFRequest, routeConfig: RouteConfigurator,
            endPointConfig: EndPointConfigurator): Observable<PermissionResult> {
        let permissionFilters = <IPermissionFilter[]>[];
        const permissionFilter = endPointConfig.permissionFilter || routeConfig.permissionFilter || this.defaultPermissionFilter;
        if (permissionFilter) {
            permissionFilters.push(permissionFilter);
        }
        if (routeConfig.addPermissionFilters) {permissionFilters = permissionFilters.concat(routeConfig.addPermissionFilters); }
        if (endPointConfig.addPermissionFilters) {permissionFilters = permissionFilters.concat(endPointConfig.addPermissionFilters); }
        if (permissionFilters.length) {
            return this.scanPermissionFilters(req, permissionFilters, 0);
        } else {
            return Observable.empty();
        }
    }

    private scanPermissionFilters(req: TRFRequest, permissionFilters: IPermissionFilter[], index: number): Observable<PermissionResult> {
        return permissionFilters[index].filter(req, this.userModel).switchMap((result: PermissionResult) => {
            if (result.isOk && index < permissionFilters.length - 1) {
                return this.scanPermissionFilters(req, permissionFilters, index + 1);
            } else {
                return Observable.create((observer: Observer<PermissionResult>) => {
                    observer.next(result);
                    observer.complete();
                });
            }
        });
    }

    private manageEndPointError(req: express.Request, resp: express.Response, err: any) {
        if (err instanceof AuthFilterError) {
            resp.status(401);
            resp.json({
                reason: 'Invalid request authentication informations',
                details: err.message
            });
        } else {
            resp.status(500);
            resp.json({
                reason: 'Unhandled error',
                details: err instanceof String ? err : JSON.stringify(err)
            });
        }
    }

    private manageEndPointAuthFilter(req: TRFRequest, resp: express.Response, routeConfig: RouteConfigurator,
            endPointConfig: EndPointConfigurator, endPoint: Function) {
        let user: IUser;
        let err: any;
        this.callEndPointAuthFilter(req, routeConfig, endPointConfig)
            .finally(() => {
                if (err) {
                    this.manageEndPointError(req, resp, err);
                } else {
                    if (user) {
                        req.user = user;
                    }
                    this.manageEndPointAuthPermission(req, resp, routeConfig, endPointConfig, endPoint);
                }
            })
            .subscribe((iUser: IUser) => {
                user = iUser;
            }, (authFilterErr: any) => {
                err = authFilterErr;
            });
    }

    private manageEndPointAuthPermission(req: TRFRequest, resp: express.Response, routeConfig: RouteConfigurator,
            endPointConfig: EndPointConfigurator, endPoint: Function) {
        let result: PermissionResult;
        let err: any;
        this.callAuthPermissions(req, routeConfig, endPointConfig)
            .finally(() => {
                if (err) {
                    this.manageEndPointError(req, resp, err);
                } else if (!result || result.isOk) {
                    this.manageEndPointPermissions(req, resp, routeConfig, endPointConfig, endPoint);
                } else {
                    resp.status(401);
                    resp.json({
                        reason: 'Request not authenticated',
                        details: result ? result.rejectionReason : ''
                    });
                }
            }).subscribe((permissionResult: PermissionResult) => {
                result = permissionResult;
            }, (authPermissionErr: any) => {
                err = authPermissionErr;
            });
    }

    private manageEndPointPermissions(req: TRFRequest, resp: express.Response, routeConfig: RouteConfigurator,
            endPointConfig: EndPointConfigurator, endPoint: Function) {
        let result: PermissionResult;
        let err: any;
        this.callPermissions(req, routeConfig, endPointConfig)
            .finally(() => {
                if (err) {
                    this.manageEndPointError(req, resp, err);
                } else if (!result || result.isOk) {
                    try {
                        endPoint(req, resp);
                    } catch (e) {
                        this.manageEndPointError(req, resp, err);
                    }
                } else {
                    resp.status(403);
                    resp.json({
                        reason: 'Request not authorized',
                        details: result ? result.rejectionReason : ''
                    });
                }
            }).subscribe((permissionResult: PermissionResult) => {
                result = permissionResult;
            }, (error: any) => {
                err = error;
            });
    }

    private addRoute(mViewset: { new(): ViewSet<DbHelperModel>}, key: string, routeConfig: RouteConfigurator,
            endPointConfig: EndPointConfigurator, router: express.Router) {
        if (!endPointConfig.path || endPointConfig.path[0] !== '/') {
            endPointConfig.path = '/' + endPointConfig.path;
        }
        endPointConfig.method = endPointConfig.method || 'get';
        console.info(endPointConfig.method!.toUpperCase() +  ' ' + endPointConfig.path + ' => ' + mViewset.name + '.' + key);
        const endPoint = (req: express.Request, resp: express.Response, next: express.NextFunction) => {
            const viewset = new mViewset();
            this.manageEndPointAuthFilter(req as TRFRequest, resp, routeConfig, endPointConfig,
                (viewset as any)[key]);
        };
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
        debug('init database');
        QueryManager.init(this.dbConfig);
        debug('ts-express:server');
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
                console.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
                case 'EADDRINUSE':
                console.error(`${bind} is already in use`);
                process.exit(1);
                break;
                default:
                throw error;
            }
        }

        function onListening(): void {
            const addr = server.address();
            const bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
            debug(`Listening on ${bind}`);
        }
    }
}
