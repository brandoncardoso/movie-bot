import { Command } from './command.js'
import { Subscribe } from './subscribe.js'
import { Unsubscribe } from './unsubscribe.js'
import { Trailer } from './trailer.js'

export const Commands: { [commandName: string]: Command } = {
	[Subscribe.data.name]: Subscribe,
	[Unsubscribe.data.name]: Unsubscribe,
	[Trailer.data.name]: Trailer,
}
