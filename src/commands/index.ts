import { Command } from './types.js'
import { Subscribe } from './subscribe.js'
import { Unsubscribe } from './unsubscribe.js'
import { Movie } from './movie.js'

export const Commands: { [commandName: string]: Command } = {
	[Subscribe.data.name]: Subscribe,
	[Unsubscribe.data.name]: Unsubscribe,
	[Movie.data.name]: Movie,
}
