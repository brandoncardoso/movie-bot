export type MovieInfo = {
	title?: string
	description?: string
	trailerUrl?: string
	url?: string
	posterUrl?: string
	rating?: string
	genres?: string
	releaseDate?: string
}

export interface MovieProvider {
	findMovie(query: string): Promise<MovieInfo>
	getUpcomingMovies(): Promise<MovieInfo[]>
}
