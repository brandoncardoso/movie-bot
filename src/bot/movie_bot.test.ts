import { expect } from 'chai'
import sinon from 'sinon'
import { CacheType, Events, Interaction, InteractionReplyOptions } from 'discord.js'
import { container } from '../inversify.config'
import { Repository } from '../common'
import { TYPES } from '../types'
import { MovieBot } from './movie_bot'
import { MockMovieChannelRepository, MovieChannel } from '../movie_channel'
import { MockMovieProvider, MovieProvider } from '../movie'

describe('movie bot', () => {
	let bot: MovieBot
	let mockMovieProvider: MockMovieProvider
	let mockMovieChannelRepo: MockMovieChannelRepository

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

		mockMovieProvider = new MockMovieProvider()
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
		it('should return movie info', async () => {
			const movieTitle = 'fake movie'
			const movieInfo = await mockMovieProvider.findMovie(movieTitle)

			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: movieTitle }
					},
				},
			})

			expect(response.components).to.have.lengthOf(1)
			expect(response.embeds).to.have.lengthOf(1)
			const embed = response.embeds[0] as unknown as { data: Record<string, unknown> }
			expect(embed.data).to.have.keys(['title', 'description', 'url', 'image', 'color', 'fields'])
			expect(embed.data.title).to.equal(movieInfo.title)
			expect(embed.data.description).to.equal(movieInfo.description)
			expect(embed.data.url).to.equal(movieInfo.url)
			expect(embed.data.image).to.equal(movieInfo.posterUrl)
		})

		it('should return movie info with a trailer button/link', async () => {
			const movieTitle = 'with trailer'
			const movieInfo = await mockMovieProvider.findMovie(movieTitle)

			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: movieTitle }
					},
				},
			})

			expect(response.embeds).to.have.lengthOf(1)
			expect(response.components).to.have.lengthOf(1)
			const { components } = response.components[0] as unknown as { components: { data: Record<string, unknown> }[] }
			expect(components).to.have.lengthOf(1)
			expect(components[0].data.url).to.equal(movieInfo.trailerUrl)
		})

		it('should return movie info with a details button/link', async () => {
			const movieTitle = 'fake movie'
			const movieInfo = await mockMovieProvider.findMovie(movieTitle)

			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: movieTitle }
					},
				},
			})

			expect(response.embeds).to.have.lengthOf(1)
			expect(response.components).to.have.lengthOf(1)
			const { components } = response.components[0] as unknown as { components: { data: Record<string, unknown> }[] }
			expect(components).to.have.lengthOf(1)
			expect(components[0].data.url).to.equal(movieInfo.url)
		})

		it('should tell user if no movie was found with their query', async () => {
			sinon.stub(mockMovieProvider, 'findMovie').throws('not found')
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
			const upcomingMovies = await mockMovieProvider.getUpcomingMovies()

			await bot.subscribeChannel('fake_channel')
			await bot.postUpcomingMovies()

			expect(sendMessage.callCount).to.equal(upcomingMovies.length)
		})

		it('should not post when there are no upcoming movies', async () => {
			const sendMessage = sinon.stub(bot, 'sendMessageToChannel')
			sinon.stub(mockMovieProvider, 'getUpcomingMovies').resolves([])

			await bot.subscribeChannel('fake_channel')
			await bot.postUpcomingMovies()

			expect(sendMessage.callCount).to.equal(0)
		})
	})
})
