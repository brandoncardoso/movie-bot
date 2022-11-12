import { channelDb } from './datastores.js'

class Channel {
	channelId: string
	webhookId: string
	webhookToken: string

	constructor(id: string, webhookId: string, webhookToken: string) {
		this.channelId = id
		this.webhookId = webhookId
		this.webhookToken = webhookToken
	}
}

export class ChannelRepo {
	channels = channelDb

	addChannel(channelId: string, webhookId: string, webhookToken: string) {
		return this.channels.update({ channelId }, new Channel(channelId, webhookId, webhookToken), {
			upsert: true,
		})
	}

	removeChannel(channelId: string) {
		return this.channels.remove({ channelId }, { multi: true })
	}

	getChannel(channelId: string): Promise<Channel> {
		return this.channels.findOne({ channelId })
	}

	getAllChannels() {
		return this.channels.find({})
	}

	getAllSubscribedChannels(): Promise<Channel[]> {
		return this.channels.find({ webhookId: { $exists: true } })
	}

	unsubscribeChannel(channelId: string) {
		return this.channels.update(
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
}
