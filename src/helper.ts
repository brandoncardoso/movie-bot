import dotenv from 'dotenv'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionReplyOptions } from 'discord.js'
import { MovieInfo } from './movie/movie-info'

dotenv.config()

export function getMovieInfoMessage(movieInfo: MovieInfo): InteractionReplyOptions | null {
	const embed = new EmbedBuilder()
		.setTitle(movieInfo.title)
		.setDescription(movieInfo.description)
		.setURL(movieInfo.url)
		.setColor(0xff0000)
		.setImage(movieInfo.posterUrl)
		.addFields(
			{ name: 'Genres', value: movieInfo.genres, inline: true },
			{ name: 'Release Date', value: movieInfo.releaseDate, inline: true },
			{ name: 'Rating', value: movieInfo.rating, inline: true }
		)

	const actions = new ActionRowBuilder<ButtonBuilder>()

	if (movieInfo.trailerUrl) {
		actions.addComponents(
			new ButtonBuilder().setLabel('Trailer').setStyle(ButtonStyle.Link).setURL(movieInfo.trailerUrl)
		)
	}

	if (movieInfo.url) {
		actions.addComponents(new ButtonBuilder().setLabel('Details').setStyle(ButtonStyle.Link).setURL(movieInfo.url))
	}

	return {
		embeds: [embed],
		components: [actions],
	}
}
