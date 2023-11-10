import 'reflect-metadata'
import { Container } from 'inversify'
import { MovieProvider } from './movie/movie-provider'
import { TMDBMovieProvider } from './movie/tmdb-movie-provider'
import { TYPES } from './types'

const container = new Container()

container.bind<MovieProvider>(TYPES.MovieProvider).to(TMDBMovieProvider)

export { container }
