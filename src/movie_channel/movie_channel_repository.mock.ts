import { injectable } from 'inversify'
import { Repository } from '../common/repository'
import { MovieChannel } from './movie_channel'

@injectable()
export class MockMovieChannelRepository implements Repository<MovieChannel> {
	private channels: Record<string, MovieChannel> = {}

	add(id: string, data: MovieChannel): Promise<MovieChannel> {
		this.channels[id] = data
		return Promise.resolve(data)
	}

	remove(id: string): Promise<void> {
		delete this.channels[id]
		return Promise.resolve()
	}

	update(id: string, data: MovieChannel): Promise<MovieChannel> {
		this.channels[id] = data
		return Promise.resolve(data)
	}

	get(id: string): Promise<MovieChannel> {
		const channel = this.channels[id]
		if (!channel) throw new Error('channel not found')
		return Promise.resolve(channel)
	}

	getAll(): Promise<MovieChannel[]> {
		return Promise.resolve(Object.values(this.channels))
	}
}
