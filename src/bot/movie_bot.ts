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
	TextChannel,
} from 'discord.js'
import { inject } from 'inversify'
import { container } from '../inversify.config.js'
import { Commands } from '../commands/index.js'
import { Repository } from '../common/index.js'
import { MovieInfo, MovieProvider } from '../movie/index.js'
import { MovieChannel } from '../movie_channel/index.js'
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
			if (!channel.subscribed) {
				await this.movieChannelRepo.update(channelId, {
					...channel,
					subscribed: true,
				})
			}
		} catch {
			await this.movieChannelRepo.add(channelId, { channelId, subscribed: true })
		}
	}

	public async unsubscribeChannel(channelId: string): Promise<void> {
		await this.movieChannelRepo.update(channelId, { channelId, subscribed: false })
	}

	public async sendMessageToChannel(channelId: string, content: MessageCreateOptions): Promise<void> {
		const channel = this.channels.cache.get(channelId) as TextChannel
		if (channel?.isTextBased()) {
			const textChannel = channel as TextChannel
			await textChannel.send(content)
		}
	}

	private registerEvents(): void {
		this.once(Events.ClientReady, () => {
			this.onReady().catch((err) => {
				console.error(err)
			})
		})
		this.on(Events.InteractionCreate, (interaction: Interaction) => {
			this.onInterationCreate(interaction).catch((err) => {
				console.error(err)
			})
		})
		this.on(Events.ChannelDelete, (channel: Channel) => {
			this.onChannelDelete(channel).catch((err) => {
				console.error(err)
			})
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
