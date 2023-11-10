import {
	ActionRowBuilder,
	ActivityType,
	ButtonBuilder,
	ButtonStyle,
	Client,
	Channel,
	EmbedBuilder,
	Events,
	GatewayIntentBits,
	Interaction,
	MessageCreateOptions,
} from 'discord.js'
import { inject } from 'inversify'
import { Commands } from '../commands/index.js'
import { Repository } from '../common/repository.js'
import { container } from '../inversify.config.js'
import { MovieInfo } from '../movie/movie_info.js'
import { MovieProvider } from '../movie/movie_provider.js'
import { MovieChannel } from '../movie_channel/movie_channel.js'
import { TYPES } from '../types.js'

export class MovieBot extends Client {
	@inject(TYPES.MovieProvider) private movieProvider = container.get<MovieProvider>(TYPES.MovieProvider)
	@inject(TYPES.MovieChannelRepository) private movieChannelRepo = container.get<Repository<MovieChannel>>(
		TYPES.MovieChannelRepository
	)

	constructor() {
		super({ intents: [GatewayIntentBits.Guilds] })
		this.registerEvents()
	}

	public findMovie(query: string): Promise<MovieInfo> {
		return this.movieProvider.findMovie(query)
	}

	public async postUpcomingMovies(): Promise<void> {
		const upcomingMovies = await this.movieProvider.getUpcomingMovies()

		const movieInfoMessages = upcomingMovies.map((movie) => this.getMovieInfoMessage(movie))
		const channels = await this.movieChannelRepo.getAll()

		const postPromises = movieInfoMessages.flatMap((message) => {
			return channels.map(({ channelId }) => this.sendMessageToChannel(channelId, message))
		})

		await Promise.all(postPromises)
		return Promise.resolve()
	}

	public async subscribeChannel(channelId: string): Promise<void> {
		try {
			const channel = await this.movieChannelRepo.get(channelId)
			if (channel.subscribed) console.log(`channel #${channelId} already subscribed`)
		} catch {
			await this.movieChannelRepo.add(channelId, { channelId, subscribed: true })
			console.log(`channel #${channelId} subscribed to receive upcoming movies`)
		}
	}

	public async unsubscribeChannel(channelId: string): Promise<void> {
		await this.movieChannelRepo.remove(channelId)
		console.log(`channel #${channelId} unsubscribed from receiving upcoming movies`)
	}

	public async sendMessageToChannel(channelId: string, content: MessageCreateOptions): Promise<void> {
		const channel = this.channels.cache.get(channelId)
		if (channel?.isTextBased()) {
			await channel.send(content)
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

	public getMovieInfoMessage(movieInfo: MovieInfo): MessageCreateOptions {
		const embed = new EmbedBuilder()
			.setTitle(movieInfo.title)
			.setDescription(movieInfo.description)
			.setURL(movieInfo.url)
			.setColor(0xff0000)
			.setImage(movieInfo.posterUrl)
			.addFields(
				{ name: 'Genres', value: movieInfo.genres, inline: true },
				{ name: 'Release Date', value: movieInfo.releaseDate, inline: true },
				{ name: 'Rating', value: movieInfo.rating, inline: true }
			)

		const actions = new ActionRowBuilder<ButtonBuilder>()

		if (movieInfo.trailerUrl) {
			actions.addComponents(
				new ButtonBuilder().setLabel('Trailer').setStyle(ButtonStyle.Link).setURL(movieInfo.trailerUrl)
			)
		}

		if (movieInfo.url) {
			actions.addComponents(new ButtonBuilder().setLabel('Details').setStyle(ButtonStyle.Link).setURL(movieInfo.url))
		}

		return {
			embeds: [embed],
			components: [actions],
		}
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
		return this.movieChannelRepo.remove(channel.id)
	}
}