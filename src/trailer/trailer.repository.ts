import { Repository } from '../common/repository'
import { Trailer } from './trailer'
import { TrailerDatastore } from './trailer.datastore'

export class TrailerRepository implements Repository<Trailer>{
	trailers = TrailerDatastore

	async add(id: string): Promise<Trailer> {
		return await this.trailers.update({ youtubeVideoId: id }, new Trailer(id), {
			upsert: true,
			returnUpdatedDocs: true,
		}) as Trailer
	}

	async remove(id: string): Promise<void> {
		await this.trailers.remove({ youtubeVideoId: id }, { multi: false })
	}

	async get(id: string): Promise<Trailer> {
		return await this.trailers.findOne({ youtubeVideoId: id }) as Trailer
	}

	async getAll(): Promise<Array<Trailer>> {
		return await this.trailers.find({})
	}

	async getTrailersSince(datetime: number): Promise<Array<Trailer>> {
		return this.trailers.find({ createdAt: { $gte: datetime } })
	}
}
