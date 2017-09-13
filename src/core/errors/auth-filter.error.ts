export class AuthFilterError implements Error {
    public name = 'Auth filter error';

    public constructor(public message: string) {}
}
