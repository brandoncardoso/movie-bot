import 'reflect-metadata'
import { Container } from 'inversify'
import { MovieProvider } from './movie/movie_provider.js'
import { TMDBMovieProvider } from './movie/tmdb_movie_provider.js'
import { TYPES } from './types.js'
import { Repository } from './common/repository.js'
import { MovieChannel, MovieChannelRepository } from './movie_channel/index.js'

const container = new Container()

container.bind<MovieProvider>(TYPES.MovieProvider).to(TMDBMovieProvider)
container.bind<Repository<MovieChannel>>(TYPES.MovieChannelRepository).to(MovieChannelRepository)

export { container }
