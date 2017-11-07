import {
    Delete,
    ModelManager,
    Serializer,
    SerializerError,
    QueryResult,
    Count,
    Select,
    QuerySelect,
    DbHelperModel,
    AutoSerializer
} from 'ts-db-helper';
import { TRFRequest } from '../interface/request.interface';
import { Page } from '../public-api/page';
import { Response } from 'express';
import { Observable } from 'rxjs/Observable';

export abstract class ViewSet<T extends DbHelperModel> {
    protected model: {new(): T};
    protected query: QuerySelect<T>;
    protected serializer: {new(a?: any, b?: any, c?: any): Serializer<T>};

    public constructor() {
        if (!this.query) {
            this.query = Select(this.model).setSize(50);
        }
        if (!this.serializer) {
            this.serializer = AutoSerializer;
        }
    }

    public search(req: TRFRequest, resp: Response) {

    }

    public list(req: TRFRequest, resp: Response) {
        if (req.query.size) {
            const size = parseInt(req.query.pageSize, 10);
            if (isNaN(size)) {
                resp.status(400);
                resp.json({
                    reason: 'Invalid page size'
                });
            } else {
                this.query.setSize(size);
            }
        }
        if (req.query.page) {
            const page = parseInt(req.query.pageNumber, 10);
            if (isNaN(page)) {
                resp.status(400);
                resp.json({
                    reason: 'Invalid page number'
                });
            } else {
                this.query.setSize(page);
            }
        }
        Count(this.query).exec().subscribe((totalElementsCount: number) => {
            const divResult = totalElementsCount / this.query.getSize();
            let max = Math.floor(divResult);
            if (divResult === max) {
                max -= 1;
            }
            if (this.query.getPage() <= max) {
                this.query.exec().subscribe((qr: QueryResult<T>) => {
                    const page = new Page();
                    page.number = this.query.getPage();
                    page.size = this.query.getSize();
                    page.total = max + 1;
                    page.totalElementsCount = totalElementsCount;
                    if (qr.rows.length) {
                        const serializer = this.getSerializerInstance(qr.rows.toArray(), true);
                        serializer.getData().subscribe((data: any[]) => {
                            page.content = data;
                            resp.status(200);
                            resp.json(page);
                        }, (err: any) => {
                            resp.status(500);
                            resp.json({
                                reason: 'an error occurred while serializing retrieved datas',
                                details: err
                            });
                        });
                    } else {
                        page.content = [];
                        resp.status(200);
                        resp.json(page);
                    }
                }, (err: any) => {
                    resp.status(500);
                    resp.json({
                        reason: 'Cannot fetch results',
                        details: err
                    });
                });
            } else {
                resp.status(400);
                resp.json({
                    reason: 'This page is out of range',
                    min: 0,
                    max: max
                });
            }
        }, (err: any) => {
            resp.status(500);
            resp.json({
                reason: 'Cannot count total "' + this.model.name + '" count',
                details: err
            });
        });
    }

    public retrieve(req: TRFRequest, resp: Response) {
        this.retrieveOrDelete(req, resp, true);
    }

    public create(req: TRFRequest, resp: Response) {
        this.persist(req, resp, true);
    }

    public update(req: TRFRequest, resp: Response) {
        this.persist(req, resp, false);
    }

    public partialUpdate(req: TRFRequest, resp: Response) {
        this.persist(req, resp, false, true);
    }

    public delete(req: TRFRequest, resp: Response) {
        this.retrieveOrDelete(req, resp, false);
    }

    private retrieveOrDelete(req: TRFRequest, resp: Response, retreive: boolean) {
        const columns = ModelManager.getInstance().getModel(this.model).columnList;
        const clauses = <{[index: string]: any}>{};
        let isInvalid = null;
        const missings = <string[]>[];
        for (const column of columns) {
            if (column.primaryKey) {
                if (req.params.hasOwnProperty(column.field)) {
                    if (column.autoIncrement && req.params[column.field] === null || req.params[column.field] === undefined) {
                        isInvalid = true;
                        missings.push(column.field);
                    } else {
                        if (isInvalid === null) {
                            isInvalid = false;
                        }
                        clauses[column.name] = req.params[column.field];
                    }
                } else {
                    isInvalid = true;
                    missings.push(column.field);
                }
            }
        }
        if (isInvalid) {
            resp.status(400);
            resp.json({
                reason: 'A primary key is missing or invalid',
                invalidFields: missings
            });
        } else {
            if (retreive) {
                Select(this.model).where(clauses).exec().subscribe((qr: QueryResult<T>) => {
                    if (qr.rows.length === 0) {
                        resp.status(404);
                        resp.json({
                            reason: 'Ressource not found'
                        });
                    } else {
                        const serializer = this.getSerializerInstance(qr.rows.item(0), false);
                        serializer.getData().subscribe((data: Object) => {
                            resp.status(200);
                            resp.json(data);
                        }, (err: any) => {
                            resp.status(500);
                            resp.json({
                                reason: 'failed to serialize'
                            });
                        });
                    }
                },  (err: any) => {
                    resp.status(500);
                    resp.json({
                        reason: 'Retrieve element did fail',
                        details: err
                    });
                });
            } else {
                Delete(this.model).where(clauses).exec().subscribe(() => {
                    resp.status(204);
                    resp.send();
                }, (err: any) => {
                    resp.status(500);
                    resp.json({
                        reason: 'Delete query did fail',
                        details: err
                    });
                });
            }
        }
    }

    private getSerializerInstance(target: T | Object | boolean, many?: boolean) {
        return this.serializer === AutoSerializer ?
            new this.serializer(this.model, target, many) :
            new this.serializer(target, many);
    }

    private persist(req: TRFRequest, resp: Response, create: boolean, partial?: boolean) {
        const data = req.body;
        if (data && !Array.isArray(data)) {
            const serializer = this.getSerializerInstance(data, false);
            if (partial) {
                serializer.setPartialParse(true);
            }
            serializer.getInstance().subscribe((instance: T) => {
                return instance.checkIfShouldUpdateFromDatabase().subscribe((shouldUpdate: boolean) => {
                    let persistObservable: Observable<any> | undefined;
                    if (shouldUpdate && create) {
                        resp.status(400);
                        resp.json({
                            reason: 'Cannot create "' + this.model.name + '", a model whith the same primary key already exists'
                        });
                    } else if (!shouldUpdate && create) {
                        resp.status(400);
                        resp.json({
                            reason: 'Cannot update instance, primary keys are not valid or model should be created first'
                        });
                    } else if (shouldUpdate) {
                        persistObservable = instance.update().map(() => {
                            return true;
                        });
                    } else {
                        persistObservable = instance.insert().map(() => {
                            return true;
                        });
                    }
                    if (persistObservable) {
                        persistObservable.subscribe((didPersist: boolean) => {
                            const savedSerializer = this.getSerializerInstance(instance, false);
                            return savedSerializer.getData().subscribe((savedData: any) => {
                                resp.status(201);
                                resp.json(savedData);
                            }, (err: any) => {
                                resp.status(500);
                                resp.json({
                                    reason: 'Deserialization of saved instance failed',
                                    details: err
                                });
                            });
                        }, (err: any) => {
                            resp.status(400);
                            resp.json({
                                reason: 'save instance did fail',
                                error: err
                            });
                        });
                    }
                }, (err: any) => {
                    resp.status(500);
                    resp.json({
                        reason: 'Fail to check if model already exists',
                        details: err
                    });
                });
            }, (err: any) => {
                if (err instanceof SerializerError) {
                    resp.status(400);
                    resp.json({
                        reason: 'one or many fields are not valid',
                        serializationMessage: err.message,
                        details: err.fieldErrors
                    });
                } else {
                    resp.status(500);
                    resp.json({
                        reason: 'Uncaught serialize error happened'
                    });
                }
            });
        } else {
            resp.status(400);
            resp.json({
                reason: 'Request body contains anything or an array. Only a json object is expected'
            });
        }
    }
}
