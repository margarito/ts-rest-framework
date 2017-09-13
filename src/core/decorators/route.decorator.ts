import { RouteManager } from '../managers/route.manager';
import { RouteBundle } from '../internal/route-bundle';
import { RouteConfigurator } from '../configurators/route.configurator';
import { ViewSet } from '../base/viewset';

export function Route<C, T extends ViewSet<C>>(config: RouteConfigurator<C>) {
    return (target: {new(): T}) => {
        let bundle = RouteManager.getInstance().getRouteBundle(target);
        if (!bundle) {
            bundle = new RouteBundle();
            RouteManager.getInstance().addRouteBundle(target, bundle);
        }
        bundle.config = config;
    };
}
