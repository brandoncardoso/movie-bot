import 'reflect-metadata'
import dotenv from 'dotenv'
import { MovieBot } from './bot/movie-bot.js'

dotenv.config()

const bot = new MovieBot()
await bot.login(process.env.DISCORD_TOKEN)
