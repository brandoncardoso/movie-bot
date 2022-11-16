import dotenv from 'dotenv'
import { EmbedBuilder } from 'discord.js'
import levenshtein from 'levenshtein'
import { MovieDb, MovieResponse } from 'moviedb-promise'
import YoutubeSearch, { Video } from 'ytsr'
import ytdl from 'ytdl-core'

dotenv.config()

const moviedb = new MovieDb(process.env.TMDB_API_KEY)

export async function getMovieInfo(query: string): Promise<MovieResponse | null> {
	console.log(`searching for '${query}'...`)
	const { results } = await moviedb.searchMovie({ query })
	if (results.length <= 0) {
		console.log(`no results found for '${query}'`)
		return null
	}

	const closest = getClosestTitleMatch(query, results)
	return moviedb.movieInfo({ id: results[closest].id })
}

export async function createMovieInfoEmbed(movieInfo: MovieResponse): Promise<EmbedBuilder | null> {
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

export async function getMovieTrailer(movie: MovieResponse): Promise<string | null> {
	return (await getTMDBTrailer(movie)) || (await getYoutubeTrailer(movie.title)) || null
}

async function getTMDBTrailer(movie: MovieResponse): Promise<string | null> {
	console.log(`searching TMDB for '${movie.title}' trailer...`)
	const { results } = await moviedb.movieVideos(movie.id)
	const trailer = results?.find(
		(video) => video.official === true && video.type === 'Trailer' && video.site === 'YouTube',
	)
	if (trailer?.key && ytdl.validateID(trailer.key)) return `https://youtu.be/${trailer.key}`
	console.log('trailer not found on TMDB.')
	return null
}

async function getYoutubeTrailer(movieName: string): Promise<string | null> {
	console.log(`searching youtube for '${movieName}' trailer...`)
	const filter = await YoutubeSearch.getFilters(`${movieName} movie trailer`).then((f) =>
		f.get('Type').get('Video'),
	)

	const { items } = await YoutubeSearch(filter.url, {
		pages: 1,
	})

	const trailer = items?.find((video: Video) =>
		video?.title?.toLowerCase().includes('trailer'),
	) as Video

	return trailer?.url
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
