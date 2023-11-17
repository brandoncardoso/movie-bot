import { injectable } from 'inversify'
import Datastore from 'nedb-promises'
import { Repository } from '../common/index.js'
import { MovieChannel } from './index.js'

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
		return (await this.channels.insert({
			channelId: id,
			...data,
		})) as MovieChannel
	}

	async remove(id: string): Promise<void> {
		await this.channels.remove({ channelId: id }, { multi: false })
	}

	async update(id: string, data: MovieChannel): Promise<MovieChannel> {
		return (await this.channels.update({ channelId: id }, data, {
			multi: false,
			returnUpdatedDocs: true,
		})) as MovieChannel
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
