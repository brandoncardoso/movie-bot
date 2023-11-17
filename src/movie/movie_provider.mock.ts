import { injectable } from 'inversify'
import { MovieInfo, MovieProvider } from './index'

@injectable()
export class MockMovieProvider implements MovieProvider {
	movies: Record<string, MovieInfo> = {
		'fake movie': {
			title: 'fake movie',
			description: 'this is a fake movie',
			rating: '100',
			genres: 'Comedy',
			releaseDate: 'Never',
			url: 'https://imdb.com',
		},
		'with trailer': {
			title: 'with trailer',
			description: 'this is a fake movie with a trailer',
			rating: '100',
			genres: 'Comedy',
			releaseDate: 'Never',
			trailerUrl: 'https://not.a-real-url.co.uk/trailers/1',
		},
	}

	findMovie(query: string): Promise<MovieInfo> {
		if (query && this.movies[query]) {
			return Promise.resolve(this.movies[query])
		} else {
			throw new Error('movie not found')
		}
	}

	getUpcomingMovies(): Promise<MovieInfo[]> {
		return Promise.resolve(Object.values(this.movies))
	}
}
