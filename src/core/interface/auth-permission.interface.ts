import { Observable } from 'rxjs/Rx';
import { IUserModel } from './user-model.interface';
import { Request } from 'express';
import { PermissionResult } from '../public-api/permission-result';

export interface IAuthPermission {
    check(req: Request, userModel: IUserModel): Observable<PermissionResult>;
}
