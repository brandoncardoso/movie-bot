import { inject, injectable } from 'inversify'
import levenshtein from 'levenshtein'
import { container } from '../inversify.config.js'
import { TYPES } from '../types.js'
import { MovieWithVideosResponse, TmdbApi } from './tmdb_api_wrapper.js'
import { MovieInfo, MovieProvider } from './types.js'

@injectable()
export class TmdbMovieProvider implements MovieProvider {
	@inject(TYPES.TmdbApi) private tmdb = container.get<TmdbApi>(TYPES.TmdbApi)

	async getUpcomingMovies(): Promise<MovieInfo[]> {
		const results = await this.tmdb.discoverMovie({
			sort_by: 'popularity.desc',
			include_video: true,
			'release_date.gte': new Date().toISOString().substring(0, 10),
		})
		return results.map((movie) => this.tranform(movie))
	}

	async findMovie(query: string): Promise<MovieInfo> {
		const results = await this.tmdb.searchMovie({ query })
		if (results.length <= 0) {
			throw new Error(`No results found for '${query}'.`)
		}

		const titles = results.map(({ title }) => title)
		const closestTitleIndex = this.getClosestTitleIndex(query, titles)
		const tmdbMovieInfo = await this.tmdb.movieInfo({
			id: results[closestTitleIndex].id,
			append_to_response: 'videos',
		})

		return this.tranform(tmdbMovieInfo)
	}

	private tranform(movie: MovieWithVideosResponse): MovieInfo {
		return {
			title: movie.title,
			description: movie.overview,
			url: movie.id ? `https://themoviedb.org/movie/${movie.id}` : null,
			posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original/${movie.poster_path}` : null,
			rating: movie.vote_average ? `${(movie.vote_average * 10).toFixed(0)}%` : 'N/A',
			genres: movie.genres?.map(({ name }) => name).join(', ') || 'N/A',
			trailerUrl: this.tryGetTrailerUrl(movie),
			releaseDate: movie.release_date
				? new Date(movie.release_date).toLocaleDateString('en-US', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
				  })
				: 'N/A',
		}
	}

	private getClosestTitleIndex(title: string, movieTitles: string[]): number {
		const targetTitle = title.trim().toLowerCase()
		const titles = movieTitles.map((movieTitle) => movieTitle.trim().toLowerCase())

		const closest = titles.reduce(
			(closest: { index: number; distance: number }, currTitle: string, index: number) => {
				const distance = new levenshtein(targetTitle, currTitle).distance
				if (distance < closest.distance) {
					return { index, distance }
				}
				return closest
			},
			{ index: 0, distance: 999 }
		)

		return closest.index
	}

	private tryGetTrailerUrl(movie: MovieWithVideosResponse): string | null {
		const trailer = movie.videos?.results?.find((video) => video.type === 'Trailer')

		if (!trailer) return null

		switch (trailer?.site) {
		case 'YouTube':
			return `https://youtu.be/${trailer.key}`
		case 'Vimeo':
			return `https://vimeo.com/${trailer.key}`
		default:
			console.log('unhandled trailer site:', trailer.site)
			return null
		}
	}
}
