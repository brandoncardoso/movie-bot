require('dotenv').config()
const fs = require('fs')
const { Client, Intents, Collection } = require('discord.js')
const snoowrap = require('snoowrap')
const schedule = require('node-schedule')
const ChannelRepo = require('./channel-repo')

const reddit = new snoowrap({
  userAgent: 'node:com.brandoncardoso.movie-trailer-bot:v1.1',
  clientId: process.env.REDDIT_API_CLIENTID,
  clientSecret: process.env.REDDIT_API_SECRET,
  refreshToken: process.env.REDDIT_API_REFRESH_TOKEN,
})

const client = new Client({ intents: Intents.FLAGS.GUILDS })

client.commands = new Collection()
const commandFiles = fs
  .readdirSync(`${__dirname}/commands`)
  .filter((file) => file.endsWith('.js'))

commandFiles.forEach((file) => {
  const command = require(`${__dirname}/commands/${file}`)
  client.commands.set(command.data.name, command)
})

client.once('ready', () => {
  console.log(`logged in as ${client.user.tag}`)
  client.user.setActivity('new movie trailers', { type: 'WATCHING' })

  schedule.scheduleJob('0 * * * *', checkForNewTrailers) // every hour
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    await interaction.reply({
      content: 'There was an error executing this command.',
    })
  }
})

client.login(process.env.DISCORD_TOKEN)

function checkForNewTrailers() {
  console.log('checking r/movies for new movie trailers...')
  const postsLimit = 10

  reddit
    .getSubreddit('movies')
    .getHot({ limit: postsLimit })
    .filter((post) => {
      const title = post.title?.toLowerCase()
      const flair = post.link_flair_text?.toLowerCase()

      return (
        !post.likes && // use reddit upvotes to track if trailer was seen by bot already
        (title?.includes('trailer') || flair?.includes('trailer'))
      )
    })
    .forEach((post) => {
      console.log('found a new movie trailer')
      post.upvote()
      broadcastToSubscribedChannels(post.url)
    })
}

function broadcastToSubscribedChannels(message) {
  ChannelRepo.getAllChannels()
    .then((channels) => {
      channels.forEach(({ id }) => {
        const channel = client.channels.cache.get(id)
        channel.send(message)
      })
    })
    .catch(console.error)
}
