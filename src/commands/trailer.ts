import {
	ApplicationCommandOptionData,
	ApplicationCommandOptionType,
	CacheType,
	Client,
	CommandInteraction,
	SlashCommandBuilder,
	TextChannel,
} from 'discord.js'
import YoutubeSearch, { Video } from 'ytsr'
import { createMovieInfoEmbed } from '../helper.js'
import { Command } from './command'

export const Trailer: Command = {
	data: new SlashCommandBuilder()
		.setName('trailer')
		.setDescription('Searchs youtube for a movie trailer.')
		.addStringOption((option) =>
			option
				.setName('movie')
				.setDescription('The name of the movie you want the trailer for.')
				.setRequired(true),
		)
		.setDMPermission(true),
	run: async function (client: Client, interaction: CommandInteraction<CacheType>): Promise<void> {
		const movieName = interaction.options.get('movie').value as string
		const trailer = await getTrailer(movieName)
		const embed = await createMovieInfoEmbed(trailer.title)

		if (trailer?.url) {
			await interaction.reply(trailer.url)
			const discordChannel: TextChannel = (await client.channels.fetch(
				interaction.channelId,
			)) as TextChannel
			await discordChannel.send({ embeds: [embed] })
		} else {
			await interaction.reply({
				content: `Sorry, I couldn't find a trailer for "${movieName}".`,
				ephemeral: true,
			})
		}
	},
}

async function getTrailer(movieName: string): Promise<Trailer> {
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

type Trailer = {
	title: string
	url: string
}
