import { injectable } from 'inversify'
import Datastore from 'nedb-promises'
import { Repository } from '../common/repository.js'
import { MovieChannel } from './movie_channel.js'

@injectable()
export class MovieChannelRepository implements Repository<MovieChannel> {
	private channels: Datastore

	constructor() {
		this.channels = Datastore.create({
			filename: './data/channels.db',
			timestampData: true,
			autoload: true,
		})
		this.channels.ensureIndex({ fieldName: 'channelId', unique: true }).catch(console.error)
	}

	async add(id: string, data: MovieChannel): Promise<MovieChannel> {
		return (await this.channels.update({ channelId: id }, data, {
			upsert: true,
			returnUpdatedDocs: true,
		})) as MovieChannel
	}

	async remove(id: string): Promise<void> {
		await this.channels.remove({ channelId: id }, { multi: false })
	}

	async get(id: string): Promise<MovieChannel> {
		const channel = (await this.channels.findOne({ channelId: id })) as MovieChannel
		if (!channel) throw new Error('Channel not found')
		return channel
	}

	async getAll(): Promise<Array<MovieChannel>> {
		return this.channels.find({})
	}
}
