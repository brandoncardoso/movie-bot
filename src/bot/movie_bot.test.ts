import { expect } from 'chai'
import sinon from 'sinon'
import { CacheType, Events, Interaction, InteractionReplyOptions } from 'discord.js'
import { container } from '../inversify.config'
import { Repository } from '../common'
import { TYPES } from '../types'
import { MovieBot } from './movie_bot'
import { MockMovieChannelRepository, MovieChannel } from '../movie_channel'
import { MovieInfo, MovieProvider } from '../movie'

describe('movie bot', () => {
	let bot: MovieBot
	let mockMovieChannelRepo: MockMovieChannelRepository
	let mockMovieProvider: MovieProvider

	const mockInteraction = (
		commandName: string,
		additionalOptions: Record<string, unknown>
	): Promise<InteractionReplyOptions> => {
		return new Promise((resolve) => {
			bot.emit(Events.InteractionCreate, {
				commandName,
				...additionalOptions,
				isCommand: () => true,
				reply: (response: InteractionReplyOptions) => resolve(response),
			} as unknown as Interaction<CacheType>)
		})
	}

	beforeEach(() => {
		container.snapshot()

		mockMovieProvider = <MovieProvider>{}
		mockMovieChannelRepo = new MockMovieChannelRepository()
		container.rebind<MovieProvider>(TYPES.MovieProvider).toConstantValue(mockMovieProvider)
		container.rebind<Repository<MovieChannel>>(TYPES.MovieChannelRepository).toConstantValue(mockMovieChannelRepo)

		bot = new MovieBot()
	})

	afterEach(() => {
		sinon.restore()
		container.restore()
	})

	describe('movie command', () => {
		const movie: MovieInfo = {
			title: 'The Godfather',
			description: 'A chronicle of the fictional Italian-American Corleone crime family',
			genres: 'Crime, Drama',
			releaseDate: '03/14/1972',
			rating: '87',
			trailerUrl: 'https://thegodfathertrailer.com',
			url: 'https://themoviedb.org',
		}

		beforeEach(() => {
			mockMovieProvider.findMovie = sinon.stub().resolves(movie)
		})

		it('should return movie info', async () => {
			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: movie.title }
					},
				},
			})

			expect(response.components).to.have.lengthOf(1)
			expect(response.embeds).to.have.lengthOf(1)
			const embed = response.embeds[0] as unknown as { data: Record<string, unknown> }
			expect(embed.data).to.have.keys(['title', 'description', 'url', 'image', 'color', 'fields'])
			expect(embed.data.title).to.equal(movie.title)
			expect(embed.data.description).to.equal(movie.description)
			expect(embed.data.url).to.equal(movie.url)
			expect(embed.data.image).to.equal(movie.posterUrl)
		})

		it('should return movie info with a trailer button/link', async () => {
			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: movie.title }
					},
				},
			})

			expect(response.embeds).to.have.lengthOf(1)
			expect(response.components).to.have.lengthOf(1)
			const { components } = response.components[0] as unknown as { components: { data: Record<string, unknown> }[] }
			const trailerComponent = components.find(({ data }) => data.url === movie.trailerUrl)
			expect(trailerComponent).to.exist
		})

		it('should return movie info with a details button/link', async () => {
			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: movie.title }
					},
				},
			})

			expect(response.embeds).to.have.lengthOf(1)
			expect(response.components).to.have.lengthOf(1)
			const { components } = response.components[0] as unknown as { components: { data: Record<string, unknown> }[] }
			const details = components.find(({ data }) => data.url === movie.url)
			expect(details).to.exist
		})

		it('should tell user if no movie was found with their query', async () => {
			mockMovieProvider.findMovie = sinon.stub().throws('not found')
			const movieQuery = 'non-existant movie'

			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: movieQuery }
					},
				},
			})

			expect(response).to.have.property('content')
			expect(response.content).to.contain(movieQuery)
			expect(response).to.have.property('ephemeral').and.to.equal(true)
		})
	})

	describe('subscribe command', () => {
		it('should subscribe a channel', async () => {
			const channelId = '1'
			await mockInteraction('subscribe', { channelId })

			const subscribedChannel = await mockMovieChannelRepo.get(channelId)

			expect(subscribedChannel.channelId).to.equal(channelId)
			expect(subscribedChannel.subscribed).to.equal(true)
		})

		it('should resubscribe a channel', async () => {
			const channelId = '1'
			await mockInteraction('subscribe', { channelId })
			await mockInteraction('unsubscribe', { channelId })
			await mockInteraction('subscribe', { channelId })

			const subscribedChannel = await mockMovieChannelRepo.get(channelId)

			expect(subscribedChannel.channelId).to.equal(channelId)
			expect(subscribedChannel.subscribed).to.equal(true)
		})
	})

	describe('unsubscribe command', () => {
		it('should unsubscribe a channel', async () => {
			const channelId = '1'
			await mockInteraction('subscribe', { channelId })
			await mockInteraction('unsubscribe', { channelId })

			const subscribedChannel = await mockMovieChannelRepo.get(channelId)

			expect(subscribedChannel.channelId).to.equal(channelId)
			expect(subscribedChannel.subscribed).to.equal(false)
		})
	})

	describe('upcoming movies', () => {
		it('should post upcoming movies', async () => {
			const sendMessage = sinon.stub(bot, 'sendMessageToChannel')
			const movies: MovieInfo[] = [
				{
					title: 'The Godfather',
					description: 'A chronicle of the fictional Italian-American Corleone crime family',
					genres: 'Crime, Drama',
					releaseDate: '03/14/1972',
					rating: '87',
					url: 'https://themoviedb.org',
				},
			]

			mockMovieProvider.getUpcomingMovies = sinon.stub().resolves(movies)

			await bot.subscribeChannel('fake_channel')
			await bot.postUpcomingMovies()

			expect(sendMessage.callCount).to.equal(movies.length)
		})

		it('should not post when there are no upcoming movies', async () => {
			const sendMessage = sinon.stub(bot, 'sendMessageToChannel')
			mockMovieProvider.getUpcomingMovies = sinon.stub().resolves([])

			await bot.subscribeChannel('fake_channel')
			await bot.postUpcomingMovies()

			expect(sendMessage.callCount).to.equal(0)
		})
	})
})
