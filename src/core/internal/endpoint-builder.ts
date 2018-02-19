import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { DbHelperModel } from 'ts-db-helper';
import { AuthFilterError } from '../errors/auth-filter.error';
import { EndPointConfigurator } from '../configurators/end-point.configurator';
import { IAuthFilter } from '../interface/auth-filter.interface';
import { IAuthPermission } from '../interface/auth-permission.interface';
import { IUserModel } from '../interface/user-model.interface';
import { RouteConfigurator } from '../configurators/route.configurator';
import { TRFRequest } from '../interface/request.interface';
import { ViewSet } from '../base/viewset';
import { IUser } from '../interface/user.interface';
import { PermissionResult } from '../public-api/permission-result';
import { IPermissionFilter } from '../interface/permission-filter.interface';
import * as express from 'express';
import { Log } from '../internal/log';

export class EndPointBuilder {
    public static userModel: IUserModel;
    public static authFilters = <IAuthFilter[]>[];
    public static defaultAuthPermission: IAuthPermission;
    public static defaultPermissionFilter: IPermissionFilter;

    public static build(mViewset: { new(): ViewSet<DbHelperModel>}, key: string, routeConfig: RouteConfigurator,
    endPointConfig: EndPointConfigurator, router: express.Router): Function {
        const endpointDescription = endPointConfig.method!.toUpperCase() +  ' ' + routeConfig.path + endPointConfig.path
            + ' => ' + mViewset.name + '.' + key;
        Log.i(endpointDescription);
        return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
            Log.d(endpointDescription);
            if (req.body) {
                Log.d('body: ' + JSON.stringify(req.body));
            }
            try {
                const viewset = new mViewset();
                EndPointBuilder.manageEndPointAuthFilter(req as TRFRequest, resp, routeConfig, endPointConfig,
                    viewset, key);
            } catch (e) {
                Log.e(e);
                resp.status(500);
                resp.json({
                    reason: 'Unhandled error',
                    details: e
                });
            }
        };
    }

    private static manageEndPointError(req: express.Request, resp: express.Response, err: any) {
        if (err instanceof AuthFilterError) {
            resp.status(401);
            resp.json({
                reason: 'Invalid request authentication informations',
                details: err.message
            });
        } else {
            Log.e(err);
            resp.status(500);
            resp.json({
                reason: 'Unhandled error',
                details: err instanceof String ? err : err.toString()
            });
        }
    }

    private static manageEndPointAuthFilter(req: TRFRequest, resp: express.Response, routeConfig: RouteConfigurator,
        endPointConfig: EndPointConfigurator, viewset: ViewSet<any>, key: string) {
        let user: IUser;
        let err: any;
        EndPointBuilder.callEndPointAuthFilter(req, routeConfig, endPointConfig)
            .finally(() => {
                if (err) {
                    EndPointBuilder.manageEndPointError(req, resp, err);
                } else {
                    if (user) {
                        req.user = user;
                    }
                    EndPointBuilder.manageEndPointAuthPermission(req, resp, routeConfig, endPointConfig, viewset, key);
                }
            })
            .subscribe((iUser: IUser) => {
                user = iUser;
            }, (authFilterErr: any) => {
                Log.e(err);
                err = authFilterErr;
            });
    }

    private static callEndPointAuthFilter(req: express.Request, routeConfig: RouteConfigurator,
        endPointConfig: EndPointConfigurator): Observable<IUser> {
        let edpFilters = <IAuthFilter[]>[];
        const authFilter = endPointConfig.authFilter || routeConfig.authFilter;
        if (authFilter) {
            Log.d(endPointConfig.authFilter ? endPointConfig.authFilter.constructor.name : 'no enpoint filter');
            Log.d(routeConfig.authFilter ? routeConfig.authFilter.constructor.name : 'no route filter');
            edpFilters.push(authFilter);
        }
        if (!edpFilters.length) {edpFilters = edpFilters.concat(EndPointBuilder.authFilters); }
        if (routeConfig.addAuthFilters) {edpFilters = edpFilters.concat(routeConfig.addAuthFilters); }
        if (endPointConfig.addAuthFilters) {edpFilters = edpFilters.concat(endPointConfig.addAuthFilters); }
        if (!edpFilters.length) {
            const u = new EndPointBuilder.userModel();
            u.isAnonymous = true;
            return Observable.from([u]);
        } else {
            return EndPointBuilder.scanAuthFilters(req, edpFilters);
        }
    }

    private static scanAuthFilters(req: express.Request, edpFilters: IAuthFilter[], index = 0): Observable<IUser> {
        return edpFilters[index].filter(req, EndPointBuilder.userModel).switchMap((user: IUser) => {
            if (!user && index < edpFilters.length - 1) {
                return EndPointBuilder.scanAuthFilters(req, edpFilters, index + 1);
            } else {
                return Observable.create((observer: Observer<IUser>) => {
                    observer.next(user);
                    observer.complete();
                });
            }
        });
    }

    private static manageEndPointAuthPermission(req: TRFRequest, resp: express.Response, routeConfig: RouteConfigurator,
        endPointConfig: EndPointConfigurator, viewset: ViewSet<any>, key: string) {
        let result: PermissionResult;
        let err: any;
        EndPointBuilder.callAuthPermissions(req, routeConfig, endPointConfig)
            .finally(() => {
                if (err) {
                    EndPointBuilder.manageEndPointError(req, resp, err);
                } else if (!result || result.isOk) {
                    EndPointBuilder.manageEndPointPermissions(req, resp, routeConfig, endPointConfig, viewset, key);
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

    private static callAuthPermissions(req: express.Request, routeConfig: RouteConfigurator,
        endPointConfig: EndPointConfigurator): Observable<PermissionResult> {
        const authPermission = endPointConfig.authPermission || routeConfig.authPermission || EndPointBuilder.defaultAuthPermission;
        if (authPermission) {
            return authPermission.check(req, EndPointBuilder.userModel);
        } else {
            return Observable.create((observer: Observer<PermissionResult>) => {
                observer.next(new PermissionResult(true));
                observer.complete();
            });
        }
    }

    private static manageEndPointPermissions(req: TRFRequest, resp: express.Response, routeConfig: RouteConfigurator,
        endPointConfig: EndPointConfigurator, viewset: ViewSet<any>, key: string) {
        let result: PermissionResult;
        let err: any;
        EndPointBuilder.callPermissions(req, routeConfig, endPointConfig)
            .finally(() => {
                if (err) {
                    EndPointBuilder.manageEndPointError(req, resp, err);
                } else if (!result || result.isOk) {
                    try {
                        (viewset as any)[key](req, resp);
                    } catch (e) {
                        EndPointBuilder.manageEndPointError(req, resp, e);
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

    private static callPermissions(req: TRFRequest, routeConfig: RouteConfigurator,
        endPointConfig: EndPointConfigurator): Observable<PermissionResult> {
        let permissionFilters = <IPermissionFilter[]>[];
        const permissionFilter = endPointConfig.permissionFilter || routeConfig.permissionFilter || EndPointBuilder.defaultPermissionFilter;
        if (permissionFilter) {
            permissionFilters.push(permissionFilter);
        }
        if (routeConfig.addPermissionFilters) {permissionFilters = permissionFilters.concat(routeConfig.addPermissionFilters); }
        if (endPointConfig.addPermissionFilters) {permissionFilters = permissionFilters.concat(endPointConfig.addPermissionFilters); }
        if (permissionFilters.length) {
            return EndPointBuilder.scanPermissionFilters(req, permissionFilters, 0);
        } else {
            return Observable.empty();
        }
    }

    private static scanPermissionFilters(req: TRFRequest, permissionFilters: IPermissionFilter[],
        index: number): Observable<PermissionResult> {
        return permissionFilters[index].filter(req, EndPointBuilder.userModel).switchMap((result: PermissionResult) => {
            if (result.isOk && index < permissionFilters.length - 1) {
                return EndPointBuilder.scanPermissionFilters(req, permissionFilters, index + 1);
            } else {
                return Observable.create((observer: Observer<PermissionResult>) => {
                    observer.next(result);
                    observer.complete();
                });
            }
        });
    }
}
