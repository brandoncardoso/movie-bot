import { CacheType, CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { MovieBot } from '../bot/movie_bot.js'
import { Command } from './command.js'

const titleOption = {
	name: 'title',
	description: 'The title of the movie you want information about.',
	required: true,
}

const data = new SlashCommandBuilder()
	.setName('movie')
	.setDescription('Get\'s information about a movie.')
	.addStringOption((option) =>
		option.setName(titleOption.name).setDescription(titleOption.description).setRequired(titleOption.required)
	)
	.setDMPermission(true)

async function run(client: MovieBot, interaction: CommandInteraction<CacheType>): Promise<void> {
	const movieName = interaction.options.get(titleOption.name).value as string
	try {
		const movieInfo = await client.findMovie(movieName)
		const { embeds, components } = client.getMovieInfoMessage(movieInfo)
		await interaction.reply({ embeds, components })
	} catch (err) {
		await interaction.reply({
			content: `Sorry, I couldn't find any movies with "${movieName}".`,
			ephemeral: true,
		})
	}
}

export const Movie: Command = { data, run }
