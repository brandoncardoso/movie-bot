const Datastore = require('nedb-promises')

class Channel {
	constructor(id, webhookId, webhookToken) {
		this.channelId = id
		this.webhookId = webhookId
		this.webhookToken = webhookToken
	}
}

const channels = Datastore.create({
	filename: './data/channels.db',
	timestampData: true,
	autoload: true,
})

channels.ensureIndex({ fieldName: 'channelId', unique: true }).catch(console.error)

function addChannel(channelId, webhookId, webhookToken) {
	return channels.update({ channelId }, new Channel(channelId, webhookId, webhookToken), {
		upsert: true,
	})
}

function removeChannel(channelId) {
	return channels.remove({ channelId }, { multi: true })
}

function getChannel(channelId) {
	return channels.findOne({ channelId })
}

function getAllChannels() {
	return channels.find({})
}

function getAllSubscribedChannels() {
	return channels.find({ webhookId: { $exists: true } })
}

function unsubscribeChannel(channelId) {
	return channels.update(
		{
			channelId,
		},
		{
			$unset: {
				webhookId: true,
				webhookToken: true,
			},
		},
	)
}

module.exports = {
	addChannel,
	removeChannel,
	getChannel,
	getAllChannels,
	getAllSubscribedChannels,
	unsubscribeChannel,
}
