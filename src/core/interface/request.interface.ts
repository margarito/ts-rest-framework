import { IUser } from './user.interface';
import { Request } from 'express';

export interface TRFRequest extends Request {
    user: IUser;
}
