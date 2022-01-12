require('dotenv').config()
const Discord = require('discord.io')
const YoutubeSearch = require('ytsr')
const schedule = require('node-schedule')
const snoowrap = require('snoowrap')

const COMMAND_PREFIX = '!'

const Datastore = require('nedb')
const trailerChannels = new Datastore({
  filename: './data/trailer_channels.db',
  autoload: true,
})

class Channel {
  constructor(id) {
    this.id = id
  }
}

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

client.setPresence({ game: { name: '!trailer' } })

client.on('ready', () => {
  console.log(`logged in as ${client.username} - ${client.id}`)
  schedule.scheduleJob('0 * * * *', checkMovieSubreddit) // every hour
})

client.on('disconnect', console.warn)

client.on('message', async (user, userId, channelId, message, event) => {
  if (userId === client.id) return
  if (!message.startsWith(COMMAND_PREFIX)) return

  const { command, arg } = getCommand(message)

  switch (command) {
    case 'trailer':
      await handleTrailerCommand(channelId, arg)
      break
    case 'registertrailerchannel':
      registerNewTrailerChannel(channelId)
      break
    case 'deregistertrailerchannel':
      deregisterNewTrailerChannel(channelId)
      break
  }
})

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

  const searchResults = await YoutubeSearch(`${arg} movie trailer`, {
    pages: 1,
  })
  const trailer = searchResults.items.find((video) =>
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
  trailerChannels.update(
    { id: channelId },
    new Channel(channelId),
    { upsert: true },
    (err, numUpdated) => {
      if (err) {
        console.error(err)
        return
      }
      console.log(`upserted ${numUpdated} new trailer channel(s): ${channelId}`)

      client.sendMessage({
        to: channelId,
        message:
          'This channel is now registered to receive new movie trailers!',
      })
    }
  )
}

function deregisterNewTrailerChannel(channelId) {
  trailerChannels.remove(
    { id: channelId },
    { multi: true },
    (err, numRemoved) => {
      if (err) {
        console.error(err)
        return
      }
      console.log(`removed ${numRemoved} trailer channel(s): ${channelId}`)

      client.sendMessage({
        to: channelId,
        message: 'This channel will no longer receive new movie trailers.',
      })
    }
  )
}

function checkMovieSubreddit() {
  console.log('checking r/movies for new movie trailers...')
  reddit
    .getSubreddit('movies')
    .getHot({ limit: 10 })
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
      broadcastNewTrailer(post)
    })
}

function broadcastNewTrailer(redditPost) {
  trailerChannels.find({}, (err, channels) => {
    if (err) console.error(err)

    channels.forEach((channel) => {
      client.sendMessage({
        to: channel.id,
        message: redditPost.url,
      })
    })
  })
}
