import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon, { SinonStubbedInstance } from 'sinon'
import { container } from '../inversify.config'
import { TYPES } from '../types'
import { MovieWithVideosResponse, TmdbApi, TmdbApiWrapper } from './tmdb_api_wrapper'
import { TmdbMovieProvider } from './tmdb_movie_provider'

chai.use(chaiAsPromised)
const expect = chai.expect

describe('TMDB Movie Provider', () => {
	let provider: TmdbMovieProvider
	let mockTmdbApi: SinonStubbedInstance<TmdbApi>

	beforeEach(() => {
		container.snapshot()

		mockTmdbApi = sinon.createStubInstance(TmdbApiWrapper)
		container.rebind<TmdbApi>(TYPES.TmdbApi).toConstantValue(mockTmdbApi)

		provider = new TmdbMovieProvider()
	})

	afterEach(() => {
		sinon.restore()
		container.restore()
	})

	describe('upcoming movies', () => {
		it('should return upcoming movies', async () => {
			const movies = [
				{
					id: 1,
					title: 'Fake Movie',
					overview: 'This is a fake movie.',
					videos: {},
				},
				{
					id: 2,
					title: 'Fake Movie #2',
					overview: 'This is a fake movie.',
					videos: {},
				},
			]
			mockTmdbApi.discoverMovie.resolves(movies)

			const upcomingMovies = await provider.getUpcomingMovies()

			expect(upcomingMovies).to.be.an('array')
			expect(upcomingMovies.length).to.equal(movies.length)
			upcomingMovies.forEach((movie, i) => {
				expect(movie.title).to.equal(movies[i].title)
			})
		})
	})

	describe('find movie', () => {
		it('should throw an error if no movies are found', async () => {
			mockTmdbApi.searchMovie.resolves([])

			const find = provider.findMovie('there are no movies with this title')

			await expect(find).to.eventually.be.rejected
		})

		it('should find the movie with the closest title', async () => {
			const movies = [
				{
					id: 0,
					title: 'The Godfather',
					genres: [{ name: 'Drama' }, { name: 'Crime' }],
				},
				{
					id: 1,
					title: 'Godzilla',
					genres: [{ name: 'Action' }, { name: 'Adventure' }],
				},
				{
					id: 2,
					title: 'The Godfather Part II',
					genres: [{ name: 'Drama' }, { name: 'Crime' }],
				},
				{
					id: 3,
					title: 'City of God',
					genres: [{ name: 'Crime' }, { name: 'Drama' }],
				},
			]
			mockTmdbApi.searchMovie.resolves(movies)
			mockTmdbApi.movieInfo.callsFake(({ id }) => {
				return Promise.resolve(movies[id] as MovieWithVideosResponse)
			})

			let movie = await provider.findMovie('godfather')
			expect(movie.title).to.equal('The Godfather')

			movie = await provider.findMovie('godfather part 2')
			expect(movie.title).to.equal('The Godfather Part II')
		})

		it('should get the movie trailer url', async () => {
			const movie = { title: 'The Godfather' }
			const trailerKey = '1'
			mockTmdbApi.searchMovie.resolves([movie])
			mockTmdbApi.movieInfo.resolves({
				...movie,
				videos: {
					results: [
						{
							type: 'Trailer',
							site: 'YouTube',
							key: trailerKey,
						},
					],
				},
			})

			const result = await provider.findMovie(movie.title)

			expect(result.trailerUrl).to.be.a('string')
			expect(result.trailerUrl).to.contain(trailerKey)
		})

		it('should handle an unknown trailer site', async () => {
			const movie = { title: 'Some Movie' }
			const trailerKey = '1'
			mockTmdbApi.searchMovie.resolves([movie])
			mockTmdbApi.movieInfo.resolves({
				...movie,
				videos: {
					results: [
						{
							type: 'Trailer',
							site: 'FakeVideoSite',
							key: trailerKey,
						},
					],
				},
			})

			const result = await provider.findMovie(movie.title)

			expect(result.trailerUrl).to.be.null
		})
	})
})
