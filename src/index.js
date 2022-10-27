require('dotenv').config()
const fs = require('fs')
const { Client, Intents, Collection } = require('discord.js')
const snoowrap = require('snoowrap')
const schedule = require('node-schedule')
const ytdl = require('ytdl-core')

const ChannelRepo = require('./repos/channel-repo')
const TrailerRepo = require('./repos/trailer-repo')

const trailerKeywords = ['trailer', 'teaser']

const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
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
    getNewTrailers({ postLimit: 30, repostSeen: true, scoreThreshold: 0 })
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

function getRedditPosts({ subreddit = 'movies', postLimit }) {
  return reddit.getSubreddit(subreddit).getHot({ limit: postLimit })
}

function getNewTrailers({
  postLimit, // number of top hot posts on r/movies to check
  scoreThreshold = 300, // only trailers that have `scoreThreshold` more upvotes than downvotes
  repostSeen = false, // whether to repost trailers that have been seen before
}) {
  const startTime = performance.now()
  console.log('checking r/movies for new movie trailers...')

  const redditPosts = getRedditPosts({ postLimit })

  redditPosts
    .filter((post) => {
      return post.score >= scoreThreshold && isMovieTrailer(post)
    })
    .map(({ url }) => ytdl.getVideoID(url))
    .filter(async (videoId) => {
      return repostSeen || (await TrailerRepo.getTrailer(videoId)) === null
    })
    .forEach(async (videoId) => {
      console.log('found a new movie trailer')
      await TrailerRepo.addTrailer(videoId)
      broadcastToSubscribedChannels(
        `https://www.youtube.com/watch?v=${videoId}`
      )
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
  return (
    ytdl.validateURL(post.url) &&
    (containsTrailerKeyword(post.title) ||
      containsTrailerKeyword(post.link_flair_text))
  )
}

function containsTrailerKeyword(string) {
  const lowercase = string?.toLowerCase()
  return (
    lowercase && trailerKeywords.some((keyword) => lowercase.includes(keyword))
  )
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
