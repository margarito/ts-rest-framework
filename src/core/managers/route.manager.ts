import { NamespaceConfigurator } from '../configurators/namespace.configurator';
import { RouteBundle } from '../internal/route-bundle';
import { ViewSet } from '../base/viewset';
import { Router } from 'express';
export class RouteManager {
    private static instance: RouteManager;

    private bundles = <{[index: string]: RouteBundle<any, any>}>{};

    private namespacies = <{[index: string]: NamespaceConfigurator|null}>{};

    public static getInstance(): RouteManager {
        if (!RouteManager.instance) {
            RouteManager.instance = new RouteManager();
        }
        return RouteManager.instance;
    }

    private constructor() {}

    public addRouteBundle(viewSet: {new(): ViewSet<any>}, bundle: RouteBundle<any, any>) {
        if (this.bundles.hasOwnProperty(viewSet.name || viewSet.constructor.name)) {
            throw new Error('Duplicate adding viewSet to route manager');
        }
        this.bundles[viewSet.name || viewSet.constructor.name] = bundle;
    }

    public getRouteBundle(viewSet: {new(): ViewSet<any>}): RouteBundle<any, any> {
        return this.bundles[viewSet.name || viewSet.constructor.name];
    }

    public addNamespaceConfiguration(namespace: {new(): any}, config: NamespaceConfigurator) {
        if (this.bundles.hasOwnProperty(namespace.name)) {
            throw new Error('Duplicate adding viewSet to route manager');
        }
        this.namespacies[namespace.name] = config || null;
    }

    public getNamespaceConfiguration(namespace: {new(): any}): NamespaceConfigurator {
        const config = this.namespacies[namespace.name];
        if (config) {
            return config;
        } else {
            throw new Error('Namespace "' + namespace.name + '" is not correctly declared, did you use @Namespace ?');
        }
    }

    public isRegisteredNamespace(namespace: {new(): any}): boolean {
        return this.namespacies.hasOwnProperty(namespace.name);
    }

    public isRegisteredViewset(viewset: {new(): any}): boolean {
        return this.bundles.hasOwnProperty(viewset.name);
    }
}
