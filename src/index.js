require('dotenv').config()
const fs = require('fs')
const {
  ActivityType,
  Client,
  Collection,
  EmbedBuilder,
  GatewayIntentBits,
} = require('discord.js')
const snoowrap = require('snoowrap')
const schedule = require('node-schedule')
const ytdl = require('ytdl-core')
const got = require('got')
const levenshtein = require('levenshtein')

const ChannelRepo = require('./repos/channel-repo')
const TrailerRepo = require('./repos/trailer-repo')

const trailerKeywords = ['trailer', 'teaser']

const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_API_CLIENTID,
  clientSecret: process.env.REDDIT_API_SECRET,
  refreshToken: process.env.REDDIT_API_REFRESH_TOKEN,
})

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

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
  client.user.setActivity('new movie trailers', { type: ActivityType.Watching })

  schedule.scheduleJob(
    '0 * * * *', // every hour
    () => postNewTrailers({ postLimit: 10 })
  )

  if (process.env.NODE_ENV === 'dev') {
    postNewTrailers({ postLimit: 200, repostSeen: true, scoreThreshold: 0 })
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

async function postNewTrailers(options) {
  const newTrailers = await getNewTrailers(options)

  let channels = await ChannelRepo.getAllChannels()
  channels = await Promise.all(channels.map(({ id }) => client.channels.fetch(id)))

  for (const trailer of newTrailers) {
    const embed = await createMovieInfoEmbed(trailer)

    for (const channel of channels) {
      if (!channel) continue

      await channel.send(trailer.videoDetails.video_url)
      const embedMessage = await channel.send({ embeds: [embed] })
      embedMessage.react('👍')
      embedMessage.react('👎')
    }
  }
}

async function createMovieInfoEmbed(trailer) {
  try {
    const movieInfo = await getMovieInfo(trailer.videoDetails.title)

    return new EmbedBuilder()
      .setTitle(`${movieInfo.Title} (${movieInfo.Year})`)
      .setDescription(movieInfo.Plot)
      .setURL(`https://imdb.com/title/${movieInfo.imdbID}`)
      .setColor(0xFF0000)
      .setThumbnail(movieInfo?.Poster)
      .addFields(
        { name: 'Genre', value: movieInfo.Genre, inline: true },
        { name: 'Released', value: movieInfo.Released, inline: true },
        { name: 'IMDb Rating', value: movieInfo.imdbRating, inline: true },
      )
  } catch (e) {
    console.error(e.message)
    return new EmbedBuilder()
      .setFooter({ text: 'Unable to find movie information on IMDb.' })
  }
}

async function getMovieInfo(title) {
  const movieTitle = title.match(/^[^\|\(-]*/)?.[0].trim() // get all text before first '|', '(' or '-'
  const movieYear = title.match(/\d{4}/)?.[0] || null

  console.log(`searching omdb for ${movieTitle} (${movieYear})...`)
  const { body } = await got({
    url: 'http://omdbapi.com',
    searchParams: {
      apiKey: process.env.OMDB_API_KEY,
      s: movieTitle,
      y: movieYear,
      type: 'movie',
    }
  })

  const result = JSON.parse(body)
  const closestMatch = result?.Search?.reduce((closest, movie, index) => {
    if (!closest) {
      return { index, distance: 999 }
    } else {
      const distance = new levenshtein(movieTitle, movie.Title).distance
      if (distance < closest.distance) {
        return { index, distance }
      }
      return closest
    }
  }, null)

  if (!closestMatch) throw new Error(`unable to find movie info for "${movieTitle}"`)

  const movieInfo = await got({
    url: 'http://omdbapi.com',
    searchParams: {
      apiKey: process.env.OMDB_API_KEY,
      i: result.Search[closestMatch.index]?.imdbID,
    }
  })
  return JSON.parse(movieInfo?.body)
}

function getRedditPosts({ subreddit = 'movies', postLimit }) {
  return reddit.getSubreddit(subreddit).getHot({ limit: postLimit })
}

async function getNewTrailers({
  postLimit, // number of top hot posts on r/movies to check
  scoreThreshold = 300, // only trailers that have `scoreThreshold` more upvotes than downvotes
  repostSeen = false, // whether to repost trailers that have been seen before
}) {
  const startTime = performance.now()
  console.log('getting new movie trailers...')

  const redditPosts = getRedditPosts({ postLimit })

  const newTrailers = await redditPosts
    .filter((post) => {
      return post.score >= scoreThreshold && isMovieTrailer(post)
    })
    .map(({ url }) => ytdl.getVideoID(url))
    .filter(async (videoId) => {
      return repostSeen || (await TrailerRepo.getTrailer(videoId)) === null
    })
    .map(async (videoId) => {
      await TrailerRepo.addTrailer(videoId)
      const videoInfo = await ytdl.getBasicInfo(videoId)
      console.log('new movie trailer:', videoInfo?.videoDetails?.title)
      return videoInfo
    })

    const endTime = performance.now()
    console.log(`done getting new movie trailers (${Math.round(endTime - startTime)}ms)`)
    return newTrailers
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
