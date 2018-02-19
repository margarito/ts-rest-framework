export class Page<T> {
    public number: number;
    public size: number;
    public total: number;
    public totalElementsCount: number;
    public content: T[];

    public isLast() {
        return this.totalElementsCount <= (this.number + 1) * this.size;
    }
}
