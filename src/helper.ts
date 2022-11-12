import {EmbedBuilder} from 'discord.js'
import got from 'got'
import levenshtein from 'levenshtein'

export async function getMovieInfo(title: string) {
	const movieTitle = title.match(/^[^\|\(-]*/)?.[0].trim() // get all text before first '|', '(' or '-'
	const movieYear = title.match(/\d{4}/)?.[0] || null

	console.log(`searching omdb for ${movieTitle} (${movieYear})...`)
	const { body } = await got({
		url: 'http://omdbapi.com',
		searchParams: {
			apiKey: process.env.OMDB_API_KEY,
			s: movieTitle,
			y: movieYear,
			type: 'movie',
		},
	})

	const result = JSON.parse(body)
	const closestMatch = result?.Search?.reduce((closest: any, movie: any, index: number) => {
		if (!closest) {
			return { index, distance: 999 }
		} else {
			const distance = new levenshtein(movieTitle, movie.Title).distance
			if (distance < closest.distance) {
				return { index, distance }
			}
			return closest
		}
	}, null)

	if (!closestMatch) throw new Error(`unable to find movie info for "${movieTitle}"`)

	const movieInfo = await got({
		url: 'http://omdbapi.com',
		searchParams: {
			apiKey: process.env.OMDB_API_KEY,
			i: result.Search[closestMatch.index]?.imdbID,
		},
	})
	return JSON.parse(movieInfo?.body)
}

export async function createMovieInfoEmbed(title: string) {
	try {
		const movieInfo = await getMovieInfo(title)

		return new EmbedBuilder()
			.setTitle(`${movieInfo.Title} (${movieInfo.Year})`)
			.setDescription(movieInfo.Plot)
			.setURL(`https://imdb.com/title/${movieInfo.imdbID}`)
			.setColor(0xff0000)
			.setThumbnail(movieInfo?.Poster)
			.addFields(
				{ name: 'Genre', value: movieInfo.Genre, inline: true },
				{ name: 'Released', value: movieInfo.Released, inline: true },
				{ name: 'IMDb Rating', value: movieInfo.imdbRating, inline: true },
			)
	} catch (e) {
		console.error(e.message)
		return new EmbedBuilder().setFooter({
			text: 'Unable to find movie information on IMDb.',
		})
	}
}
