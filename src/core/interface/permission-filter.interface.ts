import { IUserModel } from './user-model.interface';
import { TRFRequest } from './request.interface';
import { Observable } from 'rxjs/Observable';
import { Response } from 'express';
import { PermissionResult } from '../public-api/permission-result';

export interface IPermissionFilter {
    filter: (req: TRFRequest, userModel: IUserModel) => Observable<PermissionResult>;
}
