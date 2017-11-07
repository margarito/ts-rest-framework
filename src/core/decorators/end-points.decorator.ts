import { DbHelperModel } from 'ts-db-helper';
import { RouteBundle } from '../internal/route-bundle';
import { RouteManager } from '../managers/route.manager';
import { ViewSet } from '../base/viewset';
import { EndPointConfigurator } from '../configurators/end-point.configurator';

function endPointFactory<C extends DbHelperModel, T extends ViewSet<C>>(method: string, config: EndPointConfigurator): any {
    return function (target: {new(): T}, propertyKey: string, descriptor: PropertyDescriptor) {
        let bundle = RouteManager.getInstance().getRouteBundle(target);
        if (!bundle) {
            bundle = new RouteBundle();
            RouteManager.getInstance().addRouteBundle(target, bundle);
        }
        config.method = method;
        bundle.routes[propertyKey] = config;
    };
}

export function Get(config: EndPointConfigurator): any {
    return endPointFactory('get', config);
}

export function Post(config: EndPointConfigurator): any {
    return endPointFactory('post', config);
}

export function Put(config: EndPointConfigurator): any {
    return endPointFactory('put', config);
}

export function Patch(config: EndPointConfigurator): any {
    return endPointFactory('patch', config);
}

export function Delete(config: EndPointConfigurator): any {
    return endPointFactory('delete', config);
}

export function Options(config: EndPointConfigurator): any {
    return endPointFactory('options', config);
}

export function Head(config: EndPointConfigurator): any {
    return endPointFactory('head', config);
}

export function Connect(config: EndPointConfigurator): any {
    return endPointFactory('connect', config);
}

export function Trace(config: EndPointConfigurator): any {
    return endPointFactory('trace', config);
}

export function All(config: EndPointConfigurator): any {
    return endPointFactory('all', config);
}
