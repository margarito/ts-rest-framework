import { Observable } from 'rxjs/Rx';
import { IUser } from './user.interface';


export interface IUserModel {
    new(): IUser;
    authenticate(login: string, password: string): Observable<IUser>;
}
