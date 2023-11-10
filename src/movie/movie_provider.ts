import { MovieInfo } from './movie_info.js'

export interface MovieProvider {
	findMovie(query: string): Promise<MovieInfo>
	getUpcomingMovies(): Promise<MovieInfo[]>
}
