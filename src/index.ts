import dotenv from 'dotenv'
import {
	ActivityType,
	Client,
	Events,
	GatewayIntentBits,
	hyperlink,
	WebhookClient,
} from 'discord.js'
import snoowrap, { Listing, Submission } from 'snoowrap'
import schedule from 'node-schedule'
import ytdl, { videoInfo } from 'ytdl-core'
import { Commands } from './commands/index.js'
import { ChannelRepo, TrailerRepo } from './repos/index.js'
import { createMovieInfoEmbed, getMovieInfo, getMovieTrailer } from './helper.js'

dotenv.config()

const reddit = new snoowrap({
	userAgent: process.env.REDDIT_USER_AGENT,
	clientId: process.env.REDDIT_API_CLIENTID,
	clientSecret: process.env.REDDIT_API_SECRET,
	refreshToken: process.env.REDDIT_API_REFRESH_TOKEN,
})

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const channelRepo = new ChannelRepo()
const trailerRepo = new TrailerRepo()

client.once(Events.ClientReady, async () => {
	if (!client.user || !client.application) return
	client.user.setActivity('new movie trailers', { type: ActivityType.Watching })
	console.log(`logged in as ${client.user.tag}`)

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

	const command = Commands[interaction.commandName]
	if (!command) return

	try {
		await command.run(client, interaction)
	} catch (error) {
		console.error(error)
		await interaction.reply({
			content: 'There was an error executing this command.',
		})
	}
})

client.on(Events.ChannelDelete, (channel) => {
	channelRepo.removeChannel(channel.id)
})

client.login(process.env.DISCORD_TOKEN)

async function postNewTrailers(options: {
	postLimit: number
	repostSeen?: boolean
	scoreThreshold?: number
}) {
	const newTrailers = await getNewTrailers(options)
	const channels = await channelRepo.getAllSubscribedChannels()

	for (const trailer of newTrailers) {
		const movieTitle = parseMovieTitle(trailer.videoDetails.title)
		const movieInfo = await getMovieInfo(movieTitle)

		if (!movieInfo) return

		const movieTrailer = await getMovieTrailer(movieInfo)
		const movieInfoEmbed = await createMovieInfoEmbed(movieInfo)

		for (const channel of channels) {
			try {
				const webhook = new WebhookClient({
					id: channel.webhookId,
					token: channel.webhookToken,
				})
				if (movieTrailer) {
					await webhook.send(hyperlink('', movieTrailer)) //empty message, but youtube video embed still appears
				}
				await webhook.send({ embeds: [movieInfoEmbed] })
			} catch (err) {
				if (err.code === 10015) {
					// unknown webhook
					console.log('webhook not found, unsubscribing channel:', channel.channelId)
					await channelRepo.unsubscribeChannel(channel.channelId)
				} else {
					console.error(err)
				}
			}
		}
	}
}

async function getRedditPosts({ subreddit = 'movies', postLimit }): Promise<Listing<Submission>> {
	return reddit.getSubreddit(subreddit).getHot({ limit: postLimit })
}

async function getNewTrailers({
	postLimit, // number of top hot posts on r/movies to check
	scoreThreshold = 300, // only trailers that have `scoreThreshold` more upvotes than downvotes
	repostSeen = false, // whether to repost trailers that have been seen before
}): Promise<videoInfo[]> {
	const startTime = performance.now()
	console.log('getting new movie trailers...')

	const redditPosts = await getRedditPosts({ postLimit })

	const trailerVideoIds = redditPosts
		.filter((post) => post.score >= scoreThreshold && isMovieTrailer(post))
		.map(({ url }) => ytdl.getVideoID(url))

	const newTrailers = []
	for (const videoId of trailerVideoIds) {
		const seen = await trailerRepo.getTrailer(videoId)
		console.log(`found video '${videoId}' - seen? ${!!seen}`)

		if (repostSeen || !seen) {
			try {
				const videoInfo = await ytdl.getBasicInfo(videoId)

				if (containsTrailerKeyword(videoInfo.videoDetails.title)) {
					await trailerRepo.addTrailer(videoId)
					newTrailers.push(videoInfo)
				}
			} catch (err) {
				console.error(`failed to get video info for '${videoId}'`)
				console.error(err)
			}
		}
	}

	const endTime = performance.now()
	console.log(`found ${newTrailers.length} new trailers in ${Math.round(endTime - startTime)}ms`)
	return newTrailers
}

function parseMovieTitle(string: string): string {
	// get all text before first '|', '(' or '-'
	return string.match(/^[^\|\(-]*/)?.[0].trim()
}

function isMovieTrailer(post: Submission): boolean {
	return (
		ytdl.validateURL(post.url) &&
		(containsTrailerKeyword(post.title) || containsTrailerKeyword(post.link_flair_text))
	)
}

function containsTrailerKeyword(string: string): boolean {
	const lowercase = string?.toLowerCase()
	const trailerKeywords = ['trailer', 'teaser']
	return lowercase && trailerKeywords.some((keyword) => lowercase.includes(keyword))
}
