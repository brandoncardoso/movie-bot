import { CacheType, Client, CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { getMovieInfoMessage, getMovieInfo } from '../helper.js'
import { Command } from './command'

const titleOption = {
	name: 'title',
	description: 'The title of the movie you want information about.',
	required: true,
}

const data = new SlashCommandBuilder()
	.setName('movie')
	.setDescription('Get\'s information about a movie.')
	.addStringOption((option) =>
		option
			.setName(titleOption.name)
			.setDescription(titleOption.description)
			.setRequired(titleOption.required),
	)
	.setDMPermission(true)

async function run(_client: Client, interaction: CommandInteraction<CacheType>): Promise<void> {
	const movieName = interaction.options.get(titleOption.name).value as string
	const movieInfo = await getMovieInfo(movieName)

	if (movieInfo) {
		await interaction.deferReply()
		const movieInfoMsg = await getMovieInfoMessage(movieInfo)
		await interaction.editReply(movieInfoMsg)
	} else {
		await interaction.reply({
			content: `Sorry, I couldn't find anything for "${movieName}".`,
			ephemeral: true,
		})
	}
}

export const Movie: Command = { data, run }
