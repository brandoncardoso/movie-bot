import { expect } from 'chai'
import { MockMovieProvider } from '../movie/movie-provider.mock'
import { MovieBot } from './movie-bot'

describe('movie bot', () => {
	let mockMovieProvider: MockMovieProvider
	let bot: MovieBot

	before(() => {
		mockMovieProvider = new MockMovieProvider()
		bot = new MovieBot(mockMovieProvider)
	})

	it('should find a movie', async () => {
		const movie = await bot.findMovie('some query')
		expect(movie).to.exist
	})
})
