import 'reflect-metadata'
import { Container } from 'inversify'
import { TYPES } from './types.js'
import { Repository } from './common/index.js'
import { MovieChannel, MovieChannelRepository } from './movie_channel/index.js'
import { MovieProvider, TMDBMovieProvider } from './movie/index.js'

const container = new Container()

container.bind<MovieProvider>(TYPES.MovieProvider).to(TMDBMovieProvider)
container.bind<Repository<MovieChannel>>(TYPES.MovieChannelRepository).to(MovieChannelRepository)

export { container }
