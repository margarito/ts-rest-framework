import { Observer } from 'rxjs/Rx';
import { Observable } from 'rxjs/Observable';
import { IUserModel } from '../../interface/user-model.interface';
import { IAuthPermission } from '../../interface/auth-permission.interface';
import { TRFRequest } from '../../interface/request.interface';
import { PermissionResult } from '../../public-api/permission-result';

export class AnonymousPermission implements IAuthPermission {
    check(req: TRFRequest, userModel: IUserModel): Observable<PermissionResult> {
        return Observable.create((observer: Observer<PermissionResult>) => {
            observer.next(new PermissionResult(true));
            observer.complete();
        });
    }
}
