import { INamespace } from '../interface/namespace.interface';
import { ViewSet } from '../base/viewset';

export class NamespaceConfigurator {
    public path?: string;
    public views = <{new(): ViewSet<any>|INamespace}[]>[];
}
