import dotenv from 'dotenv'
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	WebhookCreateMessageOptions,
} from 'discord.js'
import levenshtein from 'levenshtein'
import { MovieDb, MovieResponse, VideosResponse } from 'moviedb-promise'
import YoutubeSearch from 'ytsr'

dotenv.config()

const moviedb = new MovieDb(process.env.TMDB_API_KEY)

type MovieWithVideosResponse = MovieResponse & { videos: VideosResponse }

export async function getMovieInfo(query: string): Promise<MovieWithVideosResponse | null> {
	console.log(`searching for '${query}'...`)
	const { results } = await moviedb.searchMovie({ query })
	if (results.length <= 0) {
		console.log(`no results found for '${query}'`)
		return null
	}

	const closest = getClosestTitleMatch(query, results)
	const info = await moviedb.movieInfo({ id: results[closest].id, append_to_response: 'videos' })
	return info as MovieWithVideosResponse
}

export async function getMovieInfoMessage(
	movieInfo: MovieWithVideosResponse,
): Promise<WebhookCreateMessageOptions | null> {
	const trailer = await getMovieTrailer(movieInfo)
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

	const embed = new EmbedBuilder()
		.setTitle(movieInfo.title)
		.setDescription(movieInfo.overview)
		.setURL(imdbUrl)
		.setColor(0xff0000)
		.setImage(posterUrl)
		.addFields(
			{ name: 'Genres', value: genres, inline: true },
			{ name: 'Released', value: releaseDate.toLocaleString(), inline: true },
			{ name: 'Score', value: rating, inline: true },
		)

	const actions = new ActionRowBuilder<ButtonBuilder>()

	if (trailer) {
		actions.addComponents(
			new ButtonBuilder().setLabel('Trailer').setStyle(ButtonStyle.Link).setURL(trailer),
		)
	}

	if (imdbUrl) {
		actions.addComponents(
			new ButtonBuilder().setLabel('IMDb').setStyle(ButtonStyle.Link).setURL(imdbUrl),
		)
	}

	return {
		embeds: [embed],
		components: [actions],
	}
}

export async function getMovieTrailer(movie: MovieWithVideosResponse): Promise<string | null> {
	return getTMDBTrailer(movie) || (await getYoutubeSearch(movie.title)) || null
}

function getTMDBTrailer(movie: MovieWithVideosResponse): string | null {
	const trailer = movie.videos?.results?.find((video) => video.type === 'Trailer')

	if (!trailer) {
		console.log('trailer not found on TMDB')
		return null
	}

	switch (trailer?.site) {
	case 'YouTube':
		return `https://youtu.be/${trailer.key}`
	case 'Vimeo':
		return `https://vimeo.com/${trailer.key}`
	default:
		console.error('unhandled trailer site:', trailer.site)
		return null
	}
}

async function getYoutubeSearch(movieName: string): Promise<string | null> {
	console.log(`creating youtube search link for '${movieName}' trailer...`)
	const filter = await YoutubeSearch.getFilters(`${movieName} movie trailer`).then((f) =>
		f.get('Type').get('Video'),
	)

	return filter.url
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
