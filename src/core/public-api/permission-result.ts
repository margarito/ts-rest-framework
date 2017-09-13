export class PermissionResult {
    public isOk: boolean;
    public rejectionReason: string;

    constructor(ok?: boolean) {
        this.isOk = ok || false;
    }
}
