import { IUser } from '../../interface/user.interface';

export class JWTConfiguration {
    public algorithm?: string;
    public expiresIn = 60 * 60 * 24;
    public secret: string;
    public serializeUser: (user: IUser) => {[index: string]: any};
    public deserializeUser: (data: any) => IUser;
    public httpHeader = 'Authorization';
    public httpHeaderAuthType = 'JWT';
    public issuer = 'trf-app:issuer';
    public audience = 'trf-app:audience';
}
