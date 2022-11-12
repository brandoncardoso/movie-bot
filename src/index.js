const dotenv = require('dotenv')
const fs = require('fs')
const {
	ActivityType,
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	WebhookClient,
} = require('discord.js')
const snoowrap = require('snoowrap')
const schedule = require('node-schedule')
const ytdl = require('ytdl-core')
const ChannelRepo = require('./repos/channel-repo')
const TrailerRepo = require('./repos/trailer-repo')

dotenv.config()

const reddit = new snoowrap({
	userAgent: process.env.REDDIT_USER_AGENT,
	clientId: process.env.REDDIT_API_CLIENTID,
	clientSecret: process.env.REDDIT_API_SECRET,
	refreshToken: process.env.REDDIT_API_REFRESH_TOKEN,
})

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.commands = new Collection()
const commandFiles = fs.readdirSync(`${__dirname}/commands`).filter((file) => file.endsWith('.js'))

commandFiles.forEach((file) => {
	const command = require(`${__dirname}/commands/${file}`)
	client.commands.set(command.data.name, command)
})

client.once(Events.ClientReady, () => {
	console.log(`logged in as ${client.user.tag}`)
	client.user.setActivity('new movie trailers', { type: ActivityType.Watching })

	schedule.scheduleJob(
		'0 * * * *', // every hour
		() => postNewTrailers({ postLimit: 10 }),
	)

	if (process.env.NODE_ENV === 'dev') {
		postNewTrailers({ postLimit: 100, repostSeen: true, scoreThreshold: 0 })
	}
})

client.on(Events.InteractionCreate, async (interaction) => {
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

client.on(Events.ChannelDelete, (channel) => {
	ChannelRepo.removeChannel(channel.id)
})

client.login(process.env.DISCORD_TOKEN)

async function postNewTrailers(options) {
	const newTrailers = await getNewTrailers(options)

	const channels = await ChannelRepo.getAllSubscribedChannels()

	for (const trailer of newTrailers) {
		for (const channel of channels) {
			try {
				const webhook = new WebhookClient({
					id: channel.webhookId,
					token: channel.webhookToken,
				})
				await webhook.send(trailer.videoDetails.video_url)
			} catch (err) {
				if (err.code === 10015) {
					// unknown webhook
					console.log('webhook not found, unsubscribing channel:', channel.channelId)
					await ChannelRepo.unsubscribeChannel(channel.channelId)
				} else {
					console.error(err)
				}
			}
		}
	}
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
		(containsTrailerKeyword(post.title) || containsTrailerKeyword(post.link_flair_text))
	)
}

function containsTrailerKeyword(string) {
	const lowercase = string?.toLowerCase()
	const trailerKeywords = ['trailer', 'teaser']
	return lowercase && trailerKeywords.some((keyword) => lowercase.includes(keyword))
}
