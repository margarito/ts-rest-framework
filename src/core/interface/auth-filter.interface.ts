import { IUser } from './user.interface';
import { IUserModel } from './user-model.interface';
import { Observable } from 'rxjs/Observable';
import { Request } from 'express';

export interface IAuthFilter {

    filter(req: Request, userModel: IUserModel): Observable<IUser>;
}
