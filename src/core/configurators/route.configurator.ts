import { IAuthFilter } from '../interface/auth-filter.interface';
import { IAuthPermission } from '../interface/auth-permission.interface';
import { IPermissionFilter } from '../interface/permission-filter.interface';
import { RequestHandler } from 'express';

export class RouteConfigurator {
    public path: string;
    public authFilter?: IAuthFilter;
    public addAuthFilters?: IAuthFilter[];
    public authPermission?: IAuthPermission;
    public permissionFilter?: IPermissionFilter;
    public addPermissionFilters?: IPermissionFilter[];
    public middlewares?: RequestHandler[];
}
