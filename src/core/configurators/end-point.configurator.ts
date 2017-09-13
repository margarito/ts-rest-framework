import { IAuthFilter } from '../interface/auth-filter.interface';
import { IAuthPermission } from '../interface/auth-permission.interface';
import { IPermissionFilter } from '../interface/permission-filter.interface';

export class EndPointConfigurator {
    public path: string;
    public method?: string;
    public authFilter?: IAuthFilter;
    public addAuthFilters?: IAuthFilter[];
    public authPermission?: IAuthPermission;
    public permissionFilter?: IPermissionFilter;
    public addPermissionFilters?: IPermissionFilter[];
}
