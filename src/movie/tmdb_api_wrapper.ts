import { injectable } from 'inversify'
import {
	DiscoverMovieRequest,
	IdAppendToResponseRequest,
	MovieDb,
	MovieResponse,
	SearchMovieRequest,
	VideosResponse,
} from 'moviedb-promise'

export type MovieWithVideosResponse = MovieResponse & { videos: VideosResponse }

export interface TmdbApi {
	discoverMovie(params: DiscoverMovieRequest): Promise<MovieWithVideosResponse[]>
	searchMovie(params: SearchMovieRequest): Promise<MovieResponse[]>
	movieInfo(params: IdAppendToResponseRequest): Promise<MovieWithVideosResponse>
}

@injectable()
export class TmdbApiWrapper implements TmdbApi {
	tmdb: MovieDb

	constructor() {
		this.tmdb = new MovieDb(process.env.TMDB_API_KEY)
	}

	async discoverMovie(params: DiscoverMovieRequest): Promise<MovieWithVideosResponse[]> {
		const { results } = await this.tmdb.discoverMovie(params)
		return results as unknown as MovieWithVideosResponse[]
	}

	async searchMovie(params: SearchMovieRequest): Promise<MovieResponse[]> {
		const { results } = await this.tmdb.searchMovie(params)
		return results as MovieResponse[]
	}

	async movieInfo(params: IdAppendToResponseRequest): Promise<MovieWithVideosResponse> {
		const result = await this.tmdb.movieInfo(params)
		return result as MovieWithVideosResponse
	}
}
