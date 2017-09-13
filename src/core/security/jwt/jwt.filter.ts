import { Observer } from 'rxjs/Observer';
import { IUser } from '../../interface/user.interface';
import { Observable } from 'rxjs/Observable';
import { IUserModel } from '../../interface/user-model.interface';
import { filter } from 'rxjs/operator/filter';
import { IAuthFilter } from '../../interface/auth-filter.interface';
import { JWTConfiguration } from './jwt.configuration';
import { Request } from 'express';
import { AuthFilterError } from '../../errors/auth-filter.error';
import { StringUtils } from '../../utils/string.utils';
import * as jwt from 'jsonwebtoken';

export class JWTFilter implements IAuthFilter {

    constructor(private config: JWTConfiguration) {}

    filter(req: Request, userModel: IUserModel): Observable<IUser> {

        return Observable.create((observer: Observer<IUser>) => {
            const header = req.headers[this.config.httpHeader.toLowerCase()];
            let token: string | null = null;
            let err: string | null = null;
            if (header && StringUtils.isString(header)) {
                if (this.config.httpHeaderAuthType) {
                    const headerParts = (header as string).split(' ');
                    if (headerParts.length === 2 && headerParts[0].toUpperCase() === this.config.httpHeaderAuthType.toUpperCase()) {
                        token = headerParts[1];
                    } else {
                        err = 'Token header do not conform to "' + this.config.httpHeaderAuthType + ' <token>"';
                    }
                } else {
                    token = (header as string);
                }
            }
            if (token) {
                const decodeConfig = <{[index: string]: any}>{};
                if (this.config.audience) {decodeConfig.audience = this.config.audience; }
                if (this.config.algorithm) {decodeConfig.algorithm = this.config.algorithm; }
                if (this.config.issuer) {decodeConfig.algorithm = this.config.algorithm; }
                jwt.verify(token, this.config.secret, decodeConfig,
                    (error: jwt.JsonWebTokenError, decoded: string | {[index: string]: any}) => {
                    if (error) {
                        console.error(error.message || JSON.stringify(error));
                        observer.error(new AuthFilterError(error.name + ': ' + error.message));
                    } else if (decoded instanceof String) {
                        observer.error(new AuthFilterError('Token has an invalid payload'));
                    } else if (decoded.user) {
                        try {
                            const user = this.config.deserializeUser(decoded.user);
                            observer.next(user);
                        } catch (e) {
                            console.error(e.message || JSON.stringify(e));
                            observer.error(new AuthFilterError('Token contains invalid user'));
                        }
                    }
                    observer.complete();
                });
            } else {
                if (err) {
                    observer.error(new AuthFilterError(err));
                } else {
                    const user = new userModel();
                    user.isAnonymous = true;
                    observer.next(user);
                }
                observer.complete();
            }
        });
    }
}
