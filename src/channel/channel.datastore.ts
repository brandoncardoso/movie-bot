import Datastore from 'nedb-promises'

export const ChannelDatastore: Datastore = Datastore.create({
	filename: './data/channels.db',
	timestampData: true,
	autoload: true,
})

ChannelDatastore.ensureIndex({ fieldName: 'channelId', unique: true }).catch(console.error)
