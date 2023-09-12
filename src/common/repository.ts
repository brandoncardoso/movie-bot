export interface Repository<T> {
	add(id: string, data: T): Promise<T>
	remove(id: string): Promise<void>
	get(id: string): Promise<T>
	getAll(): Promise<Array<T>>
}
