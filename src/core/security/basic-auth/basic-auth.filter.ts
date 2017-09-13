import { Observer } from 'rxjs/Observer';
import { IUser } from '../../interface/user.interface';
import { Observable } from 'rxjs/Observable';
import { IAuthFilter } from '../../interface/auth-filter.interface';
import { IUserModel } from '../../interface/user-model.interface';
import { Request } from 'express';
import { AuthFilterError } from '../../errors/auth-filter.error';

class Credentials {
    login: string;
    password: string;
}

export class BasicAuthFilter implements IAuthFilter {

    public filter(req: Request, userModel: IUserModel): Observable<IUser> {
        return Observable.create((observer: Observer<IUser>) => {
            try {
                const credentials = this.getCredentials(req.headers.authorization);
                if (credentials) {
                    userModel.authenticate(credentials.login, credentials.password).subscribe((user: IUser) => observer.next(user),
                    (err: any) => observer.error(new AuthFilterError((err && (err.message || JSON.stringify(err)) || ''))),
                    () => observer.complete());
                } else {
                    const user = new userModel();
                    user.isAnonymous = true;
                    observer.next(user);
                    observer.complete();
                }
            } catch (e) {
                observer.error(e);
                observer.complete();
            }
        });
    }

    private getCredentials(authorization: string|string[]): Credentials | null {
        let credentials: Credentials | null = null;
        if (authorization instanceof String) {
            const tokens = authorization.split(' ');
            if (tokens.length === 2 && tokens[0].toUpperCase() === 'BASIC' && tokens[1]) {
                const buf =  new Buffer(tokens[1], 'base64');
                const plain_auth = buf.toString();
                const creds = plain_auth.split(':');
                if (creds && creds.length === 2) {
                    credentials = new Credentials();
                    credentials.login = creds[0];
                    credentials.password = creds[1];
                } else {
                    throw new AuthFilterError('Found authorization content with invalid encoded datas');
                }
            } else {
                throw new AuthFilterError('Found authorization content with invalid content');
            }
        }

        return credentials;
    }
}
