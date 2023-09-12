import Datastore from 'nedb-promises'

export const TrailerDatastore: Datastore = Datastore.create({
	filename: './data/trailers.db',
	timestampData: true,
	autoload: true,
})

TrailerDatastore.ensureIndex({ fieldName: 'youtubeVideoId', unique: true }).catch(console.error)
