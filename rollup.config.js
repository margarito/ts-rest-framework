export default {
    entry: 'dist/index.js',
    dest: 'dist/bundles/ts-rest-framework.cjs.js',
    sourceMap: false,
    format: 'cjs',
    moduleName: 'TsRestFrameworkApp',
    globals: {
        'http': 'http',
        'debug': 'debug',
        'express': 'express',
        'jsonwebtoken': 'jwt',
        'morgan': 'Morgan',
        'body-parser': 'BodyParser',
        'rxjs/Observable': 'Rx',
        'rxjs/Observer': 'Rx',
        'rxjs/Subject': 'Rx',
        'rxjs/add/operator/combineLatest': 'Rx.Observable.prototype',
        'rxjs/add/operator/map': 'Rx.Observable.prototype',
        'rxjs/add/operator/finally': 'Rx.Observable.prototype',
        'rxjs/add/operator/switchMap': 'Rx.Observable.prototype',
        'rxjs/add/Observable/empty': 'Rx.Observable.prototype'
    },
    external: [
        'http',
        'debug',
        'express',
        'jsonwebtoken',
        'morgan',
        'body-parser',
        'rxjs/Observable',
        'rxjs/Observer',
        'rxjs/Subject',
        'rxjs/add/observable/combineLatest',
        'rxjs/add/operator/map',
        'rxjs/add/operator/finally',
        'rxjs/add/operator/switchMap',
        'rxjs/add/Observable/empty'
    ]
};