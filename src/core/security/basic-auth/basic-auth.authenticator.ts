import { IUser } from '../../interface/user.interface';
import { BasicAuthFilter } from './basic-auth.filter';
import { IUserModel } from '../../interface/user-model.interface';
import { IAuthenticator } from '../../interface/authenticator.interface';
import { Request, Response } from 'express';

export class BasicAuthAuthenticator implements IAuthenticator {

    public authFilter = new BasicAuthFilter();

    public authenticate(req: Request, resp: Response, userModel: IUserModel) {
        this.authFilter.filter(req, userModel).subscribe((user: IUser) => {
            if (user && !user.isAnonymous) {
                resp.status(204);
                resp.send();
            } else {

            }
        }, (err: any) => {
            resp.status(400);
            resp.json({
                reason: 'invalid authorization header'
            });
        });
    }
}
