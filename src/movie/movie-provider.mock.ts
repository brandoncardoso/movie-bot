import { MovieInfo } from './movie-info'
import { MovieProvider } from './movie-provider'

export class MockMovieProvider implements MovieProvider {
	findMovie(): Promise<MovieInfo> {
		return new Promise((resolve) => {
			const movieInfo = {
				title: 'Fake Movie'
			} as MovieInfo
			resolve(movieInfo)
		})
	}
}
