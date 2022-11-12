import { trailerDb } from './datastores.js'

class Trailer {
	youtubeVideoId: string

	constructor(youtubeVideoId: string) {
		this.youtubeVideoId = youtubeVideoId
	}
}

export class TrailerRepo {
	trailers = trailerDb

	addTrailer(youtubeVideoId: string) {
		return this.trailers.update({ youtubeVideoId }, new Trailer(youtubeVideoId), {
			upsert: true,
		})
	}

	removeTrailer(youtubeVideoId: string) {
		return this.trailers.remove({ youtubeVideoId }, { multi: true })
	}

	getTrailer(youtubeVideoId: string) {
		return this.trailers.findOne({ youtubeVideoId })
	}

	getTrailersSince(datetime: number) {
		return this.trailers.find({ createdAt: { $gte: datetime } })
	}
}
