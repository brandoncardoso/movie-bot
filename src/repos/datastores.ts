import Datastore from 'nedb-promises'

export const channelDb = Datastore.create({
	filename: './data/channels.db',
	timestampData: true,
	autoload: true,
})

channelDb.ensureIndex({ fieldName: 'channelId', unique: true }).catch(console.error)

export const trailerDb = Datastore.create({
	filename: './data/trailers.db',
	timestampData: true,
	autoload: true,
})

trailerDb.ensureIndex({ fieldName: 'youtubeVideoId', unique: true }).catch(console.error)
