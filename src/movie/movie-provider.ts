import { MovieInfo } from './movie-info'

export interface MovieProvider {
	findMovie(query: string): Promise<MovieInfo>
}
