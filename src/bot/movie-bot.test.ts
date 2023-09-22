import { expect } from 'chai'
import { CacheType, Events, Interaction, InteractionReplyOptions } from 'discord.js'
import { MockMovieProvider } from '../movie/movie-provider.mock'
import { MovieBot } from './movie-bot'

describe('movie bot', () => {
	let mockMovieProvider: MockMovieProvider
	let bot: MovieBot

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

	before(() => {
		mockMovieProvider = new MockMovieProvider()
		bot = new MovieBot(mockMovieProvider)
	})

	describe('movie command', () => {
		it('should return movie info', async () => {
			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: 'fake movie' }
					},
				},
			})

			expect(response.embeds).to.have.lengthOf(1)
			expect(response.components).to.have.lengthOf(1)
			const embed = response.embeds[0] as unknown as { data: Record<string, unknown> }
			expect(embed).to.have.property('data')
			expect(embed.data).to.have.keys(['title', 'description', 'url', 'image', 'color', 'fields'])
		})

		it('should return movie info with a trailer button/link', async () => {
			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: 'with trailer' }
					},
				},
			})

			expect(response.embeds).to.have.lengthOf(1)
			expect(response.components).to.have.lengthOf(1)
			const { components } = response.components[0] as unknown as { components: { data: Record<string, unknown> }[] }
			expect(components).to.have.lengthOf(1)
			expect(components[0].data.label).to.equal('Trailer')
			expect(components[0].data.url).to.be.a('string')
		})

		it('should return movie info with a details button/link', async () => {
			const response = await mockInteraction('movie', {
				options: {
					get: () => {
						return { value: 'fake movie' }
					},
				},
			})

			expect(response.embeds).to.have.lengthOf(1)
			expect(response.components).to.have.lengthOf(1)
			const { components } = response.components[0] as unknown as { components: { data: Record<string, unknown> }[] }
			expect(components).to.have.lengthOf(1)
			expect(components[0].data.label).to.equal('Details')
			expect(components[0].data.url).to.be.a('string')
		})
	})
})
