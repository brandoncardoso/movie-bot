import dotenv from 'dotenv'
import { MovieBot } from './bot/movie-bot.js'
import { TMDBMovieProvider } from './movie/tmdb-movie-provider.js'

dotenv.config()

const tmdbMovieProvider = new TMDBMovieProvider(process.env.TMDB_API_KEY)
const bot = new MovieBot(tmdbMovieProvider)
await bot.login(process.env.DISCORD_TOKEN)
