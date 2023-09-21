import {
	ActivityType,
	Channel,
	Client,
	Events,
	GatewayIntentBits,
	Interaction,
	TextChannel,
	WebhookClient,
} from 'discord.js'
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

	public findMovie(query: string): Promise<MovieInfo> {
		return this.movieProvider.findMovie(query)
	}

	public async registerNewMovieChannel(channelId: string): Promise<void> {
		const channel = await this.channelRepo.get(channelId)

		if (channel?.webhookId) {
			console.log(`channel #${channelId} already subscribed`)
			return
		}

		const discordChannel = (await this.channels.fetch(channelId)) as TextChannel

		const webhook = await discordChannel.createWebhook({
			name: process.env.BOT_NAME,
			avatar: './avatar.png',
		})

		await this.channelRepo.add(channelId, {
			channelId,
			webhookId: webhook.id,
			webhookToken: webhook.token,
		})
		console.log(`channel #${channelId} subscribed to receive upcoming movies`)
	}

	public async unregisterNewMovieChannel(channelId: string): Promise<void> {
		try {
			const { webhookId, webhookToken } = await this.channelRepo.get(channelId)
			const webhook = new WebhookClient({
				id: webhookId,
				token: webhookToken,
			})
			await webhook.delete()
			await this.channelRepo.remove(channelId)
			console.log(`channel #${channelId} unsubscribed from receiving upcoming movies`)
		} catch (err) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (err?.code === 10015) {
				// unknown webhook, already deleted
				console.warn('webhook not found')
			} else {
				throw err
			}
		}
	}

	private registerEvents(): void {
		this.once(Events.ClientReady, async () => {
			await this.onReady()
		})
		this.on(Events.InteractionCreate, async (interaction: Interaction) => {
			await this.onInterationCreate(interaction)
		})
		this.on(Events.ChannelDelete, async (channel: Channel) => {
			await this.onChannelDelete(channel)
		})
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
