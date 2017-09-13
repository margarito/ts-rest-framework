import { IUser } from '../../interface/user.interface';
import { Observer } from 'rxjs/Observer';
import { Observable } from 'rxjs/Observable';
import { IAuthFilter } from '../../interface/auth-filter.interface';
import { IUserModel } from '../../interface/user-model.interface';
import { Request } from 'express';

export class NoAuthFilter implements IAuthFilter {

    filter(req: Request, userModel: IUserModel): Observable<IUser> {
        return Observable.create((observer: Observer<IUser>) => {
            const user = new userModel();
            user.isAnonymous = true;
            observer.next(user);
            observer.complete();
        });
    }
}
