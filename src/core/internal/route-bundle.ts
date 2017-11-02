import { DbHelperModel } from 'ts-db-helper';
import { EndPointConfigurator } from '../configurators/end-point.configurator';
import { ViewSet } from '../base/viewset';
import { RouteConfigurator } from '../configurators/route.configurator';

export class RouteBundle<C extends DbHelperModel, T extends ViewSet<C>> {
    public config: RouteConfigurator;
    public routes = <{[index: string]: EndPointConfigurator}>{};
}
