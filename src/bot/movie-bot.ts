import { ActivityType, Channel, Client, Events, GatewayIntentBits, Interaction } from 'discord.js'
import { ChannelRepository } from '../channel/channel.repository.js'
import { Commands } from '../commands/index.js'
import { MovieInfo } from '../movie/movie-info.js'
import { MovieProvider } from '../movie/movie-provider.js'

export class MovieBot extends Client {
	channelRepo = new ChannelRepository()
	movieProvider: MovieProvider

	constructor(movieProvider: MovieProvider) {
		super({ intents: [GatewayIntentBits.Guilds] })
		this.movieProvider = movieProvider
		this.registerEvents()
	}

	public findMovie(query:string): Promise<MovieInfo> {
		return this.movieProvider.findMovie(query)
	}

	private registerEvents(): void {
		this.once(Events.ClientReady, async () => { await this.onReady() })
		this.on(Events.InteractionCreate, async (interaction: Interaction) => { await this.onInterationCreate(interaction) })
		this.on(Events.ChannelDelete, async (channel: Channel) => { await this.onChannelDelete(channel) })
	}
	
	private async onReady(): Promise<void> {
		if (!this.user || !this.application) throw new Error('Error during bot login.')

		await this.user.setUsername(process.env.BOT_NAME)
		this.user.setActivity('for new movies...', { type: ActivityType.Watching })
		console.log(`logged in as ${this.user.tag}`)
	}

	private async onInterationCreate(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return

		const command = Commands[interaction.commandName]
		if (!command) return

		try {
			await command.run(this, interaction)
		} catch (error) {
			console.error(error)
			await interaction.reply({
				content: 'There was an error executing this command.',
				ephemeral: true,
			})
		}
	}

	private async onChannelDelete(channel: Channel): Promise<void> {
		return this.channelRepo.remove(channel.id)
	}
}
