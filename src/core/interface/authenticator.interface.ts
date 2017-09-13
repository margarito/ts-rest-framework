import { IUser } from './user.interface';
import { IAuthFilter } from './auth-filter.interface';
import { IPermissionFilter } from './permission-filter.interface';
import { IUserModel } from './user-model.interface';
import { Response, Request, NextFunction } from 'express';
import { Observable } from 'rxjs/Observable';

export interface IAuthenticator {

    authFilter: IAuthFilter;

    authenticate(req: Request, resp: Response, userModel: IUserModel): void;

}
