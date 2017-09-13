import { IUser } from '../../interface/user.interface';
import { IUserModel } from '../../interface/user-model.interface';
import { IAuthenticator } from '../../interface/authenticator.interface';
import { JWTFilter } from './jwt.filter';
import { JWTConfiguration } from './jwt.configuration';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

export class JWTAuthenticator implements IAuthenticator {

    public authFilter: JWTFilter;

    public constructor(private config: JWTConfiguration) {
        this.authFilter = new JWTFilter(this.config);
    }

    public authenticate(req: Request, resp: Response, userModel: IUserModel) {
        const body = req.body;
        if (body && body.username && body.password) {
            userModel.authenticate(body.username, body.password).subscribe((user: IUser) => {
                if (!user || user.isAnonymous) {
                    resp.status(400);
                    resp.json({
                        reason: 'Invalid credentials'
                    });
                } else {
                    const userData = this.config.serializeUser(user);
                    const config = <{[index: string]: any}>{};
                    if (this.config.algorithm) {config.algorithm = this.config.algorithm; }
                    if (this.config.audience) {config.audience = this.config.audience; }
                    if (this.config.issuer) {config.issuer = this.config.issuer; }
                    try {
                        const token = jwt.sign({ user: userData }, this.config.secret, config);
                        resp.status(200);
                        resp.json({
                            token: token
                        });
                    } catch (err) {
                        resp.status(500);
                        resp.json({
                            reason: 'Token creation did fail',
                            details: err.message || JSON.stringify(err)
                        });
                    }
                }
            }, (err: any) => {
                const content = {reason: ''};
                if (err instanceof String) {
                    content.reason = err as string;
                } else if (err && err.message) {
                    content.reason = err.message;
                } else {
                    content.reason = JSON.stringify(err);
                }
                resp.status(500);
                resp.json(content);
            });
        } else {
            resp.status(400);
            resp.json({
                reason: 'Username, password or both are missing in message body'
            });
        }
    }
}
