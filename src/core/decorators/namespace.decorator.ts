import { INamespace } from '../interface/namespace.interface';
import { NamespaceConfigurator } from '../configurators/namespace.configurator';
import { RouteManager } from '../managers/route.manager';

export function Namespace(config: NamespaceConfigurator) {
    return (constructor: {new(): any}): {new(): INamespace} => {
        RouteManager.getInstance().addNamespaceConfiguration(constructor, config);
        return constructor;
    };
}
