require('dotenv').config()
const Discord = require('discord.io')
const YoutubeSearch = require('ytsr')
const schedule = require('node-schedule')
const snoowrap = require('snoowrap')

const COMMAND_PREFIX = '!'

const NewTrailerChannels = []

const reddit = new snoowrap({
  userAgent: 'node:com.brandoncardoso.movie-trailer-bot:v1.0',
  clientId: process.env.REDDIT_API_CLIENTID,
  clientSecret: process.env.REDDIT_API_SECRET,
  refreshToken: process.env.REDDIT_API_REFRESH_TOKEN,
})

var client = new Discord.Client({
  token: process.env.TOKEN,
  autorun: true,
})

client.on('ready', () => {
  console.log(`logged in as ${client.username} - ${client.id}`)
  schedule.scheduleJob('0 * * * *', checkMovieSubreddit)
})

async function checkMovieSubreddit() {
  const rMoviesPosts = await reddit
    .getSubreddit('movies')
    .getHot({ limit: 10 }, 'hour')
    .filter((post) => {
      const title = post.title?.toLowerCase()
      const flair = post.link_flair_text?.toLowerCase()

      return (
        !post.likes && // use reddit upvotes to track if trailer was seen by bot already
        (title?.includes('trailer') || flair?.includes('trailer'))
      )
    })
    .forEach((post) => {
      post.upvote()
      broadcastNewTrailer(post)
    })
}

function broadcastNewTrailer(redditPost) {
  const embeddedMessage = {
    title: redditPost.title,
    url: 'reddit.com' + redditPost.permalink,
  }

  NewTrailerChannels.forEach(async (channel) => {
    client.sendMessage({
      to: channel,
      message: redditPost.url,
    })
  })
}

client.on('message', async (user, userId, channelID, message, event) => {
  if (userId === client.id) return
  if (!message.startsWith(COMMAND_PREFIX)) return

  const { command, arg } = getCommand(message)

  switch (command) {
    case 'trailer':
      await handleTrailerCommand(channelID, arg)
      break
    case 'registertrailerchannel':
      registerNewTrailerChannel(channelID)
      break
    case 'deregistertrailerchannel':
      deregisterNewTrailerChannel(channelID)
      break
  }
})

client.on('disconnect', console.warn)

function getCommand(message) {
  const temp = message.slice(COMMAND_PREFIX.length).split(' ')

  return {
    command: temp.shift().toLowerCase(),
    arg: temp.join(' '),
  }
}

async function handleTrailerCommand(channelId, arg) {
  if (!arg) {
    client.sendMessage({
      to: channelId,
      message: 'Please enter a movie or show title.',
    })
    return
  }

  const yts = await YoutubeSearch(`${arg} movie trailer`, {
    pages: 1,
  })
  const trailer = yts.items.find((video) =>
    video?.title?.toLowerCase().includes('trailer')
  )

  if (trailer) {
    client.sendMessage({
      to: channelId,
      message: trailer.url,
    })
  } else {
    client.sendMessage({
      to: channelId,
      message: `I couldn't find a movie trailer for "${arg}".`,
    })
  }
}

function registerNewTrailerChannel(channelId) {
  if (!NewTrailerChannels.find((ntc) => ntc === channelId)) {
    NewTrailerChannels.push(channelId)
  }

  client.sendMessage({
    to: channelId,
    message: 'This channel is now registered to receive new movie trailers!',
  })
}

function deregisterNewTrailerChannel(channelId) {
  const index = NewTrailerChannels.indexOf(channelId)
  if (index >= 0) {
    NewTrailerChannels.splice(index, 1)
  }

  client.sendMessage({
    to: channelId,
    message: 'This channel will no longer receive new movie trailers.',
  })
}
