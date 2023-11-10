import dotenv from 'dotenv'
import { REST } from 'discord.js'
import { Routes } from 'discord-api-types/v9'
import { Commands } from './commands/index.js'

dotenv.config()

const commands = []

Object.values(Commands).forEach((command) => {
	commands.push(command.data.toJSON())
})
const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN)

// registering commands to a specific guild/server is instant,
// global registration may take up to 1 hour
const applicationCommands =
	process.env.NODE_ENV === 'dev'
		? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
		: Routes.applicationCommands(process.env.DISCORD_CLIENT_ID)

rest
	.put(applicationCommands, {
		body: commands,
	})
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error)
