const Datastore = require('nedb-promises')

class Trailer {
	constructor(youtubeVideoId) {
		this.youtubeVideoId = youtubeVideoId
	}
}

const trailers = Datastore.create({
	filename: './data/trailers.db',
	timestampData: true,
	autoload: true,
})

trailers.ensureIndex({ fieldName: 'youtubeVideoId', unique: true }).catch(console.error)

function addTrailer(youtubeVideoId) {
	return trailers.update({ youtubeVideoId }, new Trailer(youtubeVideoId), {
		upsert: true,
	})
}

function removeTrailer(youtubeVideoId) {
	return trailers.remove({ youtubeVideoId }, { multi: true })
}

function getTrailer(youtubeVideoId) {
	return trailers.findOne({ youtubeVideoId })
}

function getTrailersSince(datetime) {
	return trailers.find({ createdAt: { $gte: datetime } })
}

module.exports = {
	addTrailer,
	removeTrailer,
	getTrailer,
	getTrailersSince,
}
