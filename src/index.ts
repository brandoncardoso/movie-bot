import dotenv from 'dotenv'
import { ActivityType, Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js'
import snoowrap, { Listing, Submission } from 'snoowrap'
import schedule from 'node-schedule'
import ytdl, { videoInfo } from 'ytdl-core'
import { Commands } from './commands/index.js'
import { getMovieInfoMessage, getMovieInfo } from './helper.js'
import { ChannelRepository } from './channel/channel.repository.js'
import { TrailerRepository } from './trailer/trailer.repository.js'

dotenv.config()

const reddit = new snoowrap({
	userAgent: process.env.REDDIT_USER_AGENT,
	clientId: process.env.REDDIT_API_CLIENTID,
	clientSecret: process.env.REDDIT_API_SECRET,
	refreshToken: process.env.REDDIT_API_REFRESH_TOKEN,
})

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const channelRepo = new ChannelRepository()
const trailerRepo = new TrailerRepository()

client.once(Events.ClientReady, async () => {
	if (!client.user || !client.application) return
	client.user.setActivity('new movie trailers', { type: ActivityType.Watching })
	console.log(`logged in as ${client.user.tag}`)

	schedule.scheduleJob(
		'0 * * * *', // every hour
		() => postNewTrailers(10),
	)

	if (process.env.NODE_ENV === 'dev') {
		await postNewTrailers(100, 0, true)
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

client.on(Events.ChannelDelete, async (channel) => {
	await channelRepo.remove(channel.id)
})

await client.login(process.env.DISCORD_TOKEN)

async function postNewTrailers(postLimit: number, scoreThreshold?: number, repostSeen?: boolean): Promise<void> {
	const newTrailers = await getNewTrailers(postLimit, scoreThreshold, repostSeen)
	const channels = await channelRepo.getAllSubscribedChannels()

	for (const trailer of newTrailers) {
		const movieTitle = parseMovieTitle(trailer.videoDetails.title)
		const movieInfo = await getMovieInfo(movieTitle)

		if (!movieInfo) continue

		const movieInfoMsg = await getMovieInfoMessage(movieInfo)

		for (const channel of channels) {
			try {
				const webhook = new WebhookClient({
					id: channel.webhookId,
					token: channel.webhookToken,
				})
				if (movieInfoMsg) await webhook.send(movieInfoMsg)
			} catch (err) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

async function getRedditPosts(postLimit: number = 100, subreddit: string = 'movies'): Promise<Listing<Submission>> {
	return reddit.getSubreddit(subreddit).getHot({ limit: postLimit })
}

async function getNewTrailers(
	postLimit: number, // number of top hot posts on r/movies to check
	scoreThreshold = 300, // only trailers that have `scoreThreshold` more upvotes than downvotes
	repostSeen = false, // whether to repost trailers that have been seen before
): Promise<videoInfo[]> {
	const startTime = performance.now()
	console.log('getting new movie trailers...')

	const redditPosts = await getRedditPosts(postLimit)

	const trailerVideoIds = redditPosts
		.filter((post) => post.score >= scoreThreshold && isMovieTrailer(post))
		.map(({ url }) => ytdl.getVideoID(url))

	const newTrailers: videoInfo[] = []
	for (const videoId of trailerVideoIds) {
		const seen = await trailerRepo.get(videoId)
		console.log(`found video '${videoId}' - seen? ${!!seen}`)

		if (repostSeen || !seen) {
			try {
				const videoInfo = await ytdl.getBasicInfo(videoId)

				if (containsTrailerKeyword(videoInfo.videoDetails.title)) {
					await trailerRepo.add(videoId)
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
	// get all text before first '|', '(', '-', '–'
	return string.match(/^[^–|(-]*/)?.[0].trim()
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
