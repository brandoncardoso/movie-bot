import 'reflect-metadata'
import { Container } from 'inversify'
import { MovieProvider } from './movie/movie-provider'
import { TMDBMovieProvider } from './movie/tmdb-movie-provider'
import { TYPES } from './types'
import { Repository } from './common/repository'
import { MovieChannel, MovieChannelRepository } from './movie_channel'

const container = new Container()

container.bind<MovieProvider>(TYPES.MovieProvider).to(TMDBMovieProvider)
container.bind<Repository<MovieChannel>>(TYPES.MovieChannelRepository).to(MovieChannelRepository)

export { container }
