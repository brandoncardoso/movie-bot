import dotenv from 'dotenv'
import { EmbedBuilder } from 'discord.js'
import levenshtein from 'levenshtein'
import { MovieDb, MovieResponse } from 'moviedb-promise'
import YoutubeSearch, { Video } from 'ytsr'

dotenv.config()

const moviedb = new MovieDb(process.env.TMDB_API_KEY)

type Trailer = {
	title: string
	url: string
}

export async function getMovieInfo(query: string): Promise<MovieResponse> {
	console.log(`searching for ${query}...`)
	const { results } = await moviedb.searchMovie({ query })
	if (results.length <= 0) throw new Error(`unable to find movie info for "${query}"`)

	return moviedb.movieInfo({ id: results[0].id })
}

export async function createMovieInfoEmbed(title: string): Promise<EmbedBuilder | null> {
	const movieInfo = await getMovieInfo(title)
	const imdbUrl = movieInfo.imdb_id ? `https://imdb.com/title/${movieInfo.imdb_id}` : null
	const posterUrl = movieInfo.poster_path
		? `https://image.tmdb.org/t/p/original/${movieInfo.poster_path}`
		: null
	const rating = movieInfo.vote_average ? `${(movieInfo.vote_average * 10).toFixed(0)}%` : 'N/A'
	const genres = movieInfo.genres?.map(({ name }) => name).join(', ') || 'N/A'
	const releaseDate = movieInfo.release_date
		? new Date(movieInfo.release_date).toLocaleDateString('en-US', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
		  })
		: 'N/A'

	return new EmbedBuilder()
		.setTitle(movieInfo.title)
		.setDescription(movieInfo.overview)
		.setURL(imdbUrl)
		.setColor(0xff0000)
		.setThumbnail(posterUrl)
		.addFields(
			{ name: 'Genre', value: genres, inline: true },
			{ name: 'Released', value: releaseDate.toLocaleString(), inline: true },
			{ name: 'Score', value: rating, inline: true },
		)
}

export async function getYoutubeTrailer(movieName: string): Promise<Trailer> {
	const filter = await YoutubeSearch.getFilters(`${movieName} movie trailer`).then((f) =>
		f.get('Type').get('Video'),
	)

	const searchResults = await YoutubeSearch(filter.url, {
		pages: 1,
	})

	return searchResults.items.find((video: Video) =>
		video?.title?.toLowerCase().includes('trailer'),
	) as Trailer
}

function getClosestTitleMatch(title: string, movies: MovieResponse[]): number {
	const targetTitle = title.trim().toLowerCase()
	const movieTitles = movies.map(({ title }) => title.trim().toLowerCase())

	const closest = movieTitles.reduce(
		(closest: { index: number; distance: number }, currTitle: string, index: number) => {
			const distance = new levenshtein(targetTitle, currTitle).distance
			if (distance < closest.distance) {
				return { index, distance }
			}
			return closest
		},
		{ index: 0, distance: 999 },
	)

	return closest.index
}
