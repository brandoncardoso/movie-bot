import {
	CommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js'
import { MovieBot } from '../bot/movie-bot.js'
import { Command } from './command'

export const Subscribe: Command = {
	data: new SlashCommandBuilder()
		.setName('subscribe')
		.setDescription('Subscribes this channel to automatically receive new movie trailers.')
		.setDefaultMemberPermissions(
			PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild,
		)
		.setDMPermission(false),
	run: async function (client: MovieBot, interaction: CommandInteraction): Promise<void> {
		await client.registerNewMovieChannel(interaction.channelId)
		await interaction.reply({
			content: 'This channel will now automatically get new movie trailers!',
			ephemeral: true,
		})
	},
}
