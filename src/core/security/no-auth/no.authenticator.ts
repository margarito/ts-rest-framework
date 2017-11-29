import { IAuthenticator } from '../../interface/authenticator.interface';
import { IUserModel } from '../../interface/user-model.interface';
import { Request, Response, NextFunction } from 'express';
import { NoAuthFilter } from './no-auth.filter';

export class NoAuthenticator implements IAuthenticator {

    public authFilter = new NoAuthFilter();

    public authenticate(req: Request, resp: Response, userModel: IUserModel): void {
        resp.status(204);
        resp.send(null);
    }
}
