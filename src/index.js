require('dotenv').config()
const fs = require('fs')
const { Client, Intents, Collection } = require('discord.js')
const snoowrap = require('snoowrap')
const schedule = require('node-schedule')
const ytdl = require('ytdl-core')

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

  schedule.scheduleJob(
    '0 * * * *', // every hour
    () => getNewTrailers({ postLimit: 10 })
  )

  if (process.env.NODE_ENV === 'dev') {
    getNewTrailers({ postLimit: 20, repostSeen: true })
  }
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

client.on('channelDelete', (channel) => {
  ChannelRepo.removeChannel(channel.id)
})

client.login(process.env.DISCORD_TOKEN)

function getNewTrailers({
  postLimit, // number of top hot posts on r/movies to check
  scoreThreshold = 300, // only trailers that have `scoreThreshold` more upvotes than downvotes
  repostSeen = false, // whether to repost trailers that have been seen before
}) {
  const startTime = performance.now()
  console.log('checking r/movies for new movie trailers...')

  reddit
    .getSubreddit('movies')
    .getHot({ limit: postLimit })
    .filter(
      async (post) =>
        (repostSeen || !post.likes) && // use upvotes to track if trailer was seen by bot already, always post during dev
        post.score >= scoreThreshold &&
        (await isMovieTrailer(post))
    )
    .forEach((post) => {
      console.log('found a new movie trailer')

      // do not upvote trailers on dev
      if (process.env.NODE_ENV !== 'dev') {
        post.upvote()
      }

      broadcastToSubscribedChannels(post.url)
    })
    .finally(() => {
      const endTime = performance.now()
      console.log(
        `done checking for new movie trailers (took ${Math.round(
          endTime - startTime
        )}ms)`
      )
    })
}

async function isMovieTrailer(post) {
  let isMovieTrailer = false

  const postTitle = post.title?.toLowerCase()
  const postFlair = post.link_flair_text?.toLowerCase()

  if (
    isYoutubeDomain(post.domain) &&
    (postTitle?.includes('trailer') || postFlair?.includes('trailer'))
  ) {
    const videoInfo = await getYoutubeVideoInfo(post.url)
    isMovieTrailer = videoInfo?.title.toLowerCase().includes('trailer')
  }

  return isMovieTrailer
}

function isYoutubeDomain(domain) {
  return domain === 'youtube.com' || domain === 'youtu.be'
}

async function getYoutubeVideoInfo(url) {
  const videoInfo = await ytdl.getInfo(url)
  return videoInfo?.videoDetails
}

function broadcastToSubscribedChannels(content) {
  ChannelRepo.getAllChannels()
    .then((channels) => {
      channels.forEach(async ({ id }) => {
        client.channels.cache
          .get(id)
          ?.send(content)
          .then((msg) => {
            msg.react('👍')
            msg.react('👎')
          })
          .catch(console.error)
      })
    })
    .catch(console.error)
}
