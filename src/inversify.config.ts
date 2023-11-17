import 'reflect-metadata'
import { Container } from 'inversify'
import { TYPES } from './types.js'
import { Repository } from './common/index.js'
import { MovieChannel, MovieChannelRepository } from './movie_channel/index.js'
import { MovieProvider, TmdbMovieProvider } from './movie/index.js'
import { TmdbApi, TmdbApiWrapper } from './movie/tmdb_api_wrapper.js'

const container = new Container()

container.bind<MovieProvider>(TYPES.MovieProvider).to(TmdbMovieProvider)
container.bind<Repository<MovieChannel>>(TYPES.MovieChannelRepository).to(MovieChannelRepository)
container.bind<TmdbApi>(TYPES.TmdbApi).to(TmdbApiWrapper)

export { container }
