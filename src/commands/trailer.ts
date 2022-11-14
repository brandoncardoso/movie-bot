import { CacheType, Client, CommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js'
import { createMovieInfoEmbed, getYoutubeTrailer } from '../helper.js'
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
		const trailer = await getYoutubeTrailer(movieName)
		const embed = await createMovieInfoEmbed(movieName)

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
