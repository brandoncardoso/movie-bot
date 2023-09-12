import { Repository } from '../common/repository'
import { ChannelDatastore } from './channel.datastore'
import { Channel } from './channel'

export class ChannelRepository implements Repository<Channel> {
	channels = ChannelDatastore

	async add(id: string, data: Channel): Promise<Channel> {
		return await this.channels.update({ channelId: id }, data, {
			upsert: true,
			returnUpdatedDocs: true,
		}) as Channel
	}

	async remove(id: string): Promise<void> {
		await this.channels.remove({ channelId: id }, { multi: false })
	}

	async get(id: string): Promise<Channel> {
		return this.channels.findOne({ channelId: id })
	}

	async getAll(): Promise<Array<Channel>> {
		return this.channels.find({})
	}

	getAllSubscribedChannels(): Promise<Channel[]> {
		return this.channels.find({ webhookId: { $exists: true } })
	}

	unsubscribeChannel(channelId: string): Promise<Channel> {
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
			{
				returnUpdatedDocs: true,
			}
		)
	}
}
