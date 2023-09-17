import { Client, CommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js'

export interface Command {
	data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
	run: (client: Client, interaction: CommandInteraction) => void | Promise<void>
}
