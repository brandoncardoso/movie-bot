require('dotenv').config()
const fs = require('fs')
const { REST } = require('discord.js')
const { Routes } = require('discord-api-types/v9')

const commands = []

const commandFiles = fs.readdirSync(`${__dirname}/commands`).filter((file) => file.endsWith('.js'))

commandFiles.forEach((file) => {
	const command = require(`${__dirname}/commands/${file}`)
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
