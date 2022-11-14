import { CacheType, Client, CommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js'
import {
	createMovieInfoEmbed,
	getMovieInfo,
	getMovieTrailer,
	getYoutubeTrailer,
} from '../helper.js'
import { Command } from './command'

const data = new SlashCommandBuilder()
	.setName('trailer')
	.setDescription('Searchs youtube for a movie trailer.')
	.addStringOption((option) =>
		option
			.setName('movie')
			.setDescription('The name of the movie you want the trailer for.')
			.setRequired(true),
	)
	.setDMPermission(true)

async function run(client: Client, interaction: CommandInteraction<CacheType>): Promise<void> {
	const movieName = interaction.options.get('movie').value as string
	const movieInfo = await getMovieInfo(movieName)

	if (movieInfo) {
		await interaction.deferReply()

		const trailer =
			(await getMovieTrailer(movieInfo)) || (await getYoutubeTrailer(movieInfo.title)) || null
		const movieInfoEmbed = await createMovieInfoEmbed(movieInfo)

		const discordChannel = (await client.channels.fetch(interaction.channelId)) as TextChannel

		if (trailer) {
			await interaction.editReply(trailer)
			await discordChannel.send({ embeds: [movieInfoEmbed] })
		} else {
			await interaction.editReply({ embeds: [movieInfoEmbed] })
		}
	} else {
		await interaction.reply({
			content: `Sorry, I couldn't find anything for "${movieName}".`,
			ephemeral: true,
		})
	}
}

export const Trailer: Command = { data, run }
