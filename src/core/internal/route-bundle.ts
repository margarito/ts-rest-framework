import { EndPointConfigurator } from '../configurators/end-point.configurator';
import { ViewSet } from '../base/viewset';
import { RouteConfigurator } from '../configurators/route.configurator';

export class RouteBundle<C, T extends ViewSet<C>> {
    public config: RouteConfigurator<C>;
    public routes = <{[index: string]: EndPointConfigurator}>{};
}
