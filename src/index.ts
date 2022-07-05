// Require the framework and instantiate it
import fastify, { FastifyInstance, FastifyRequest } from 'fastify'
import path from 'path'
import ngeohash from 'ngeohash'
import fastifyView from "@fastify/view"
import handlebars from "handlebars"
import { GeoTree } from './trees/GeoTree/GeoTree';

const server = fastify({
  logger: true
}).register(fastifyView, {
  engine: {
    handlebars: handlebars,
  },
  root: path.join(__dirname, "views"), // Points to `./views` relative to the current file
  layout:"./templates/template/layout.hbs", // Sets the layout to use to `./views/templates/layout.handlebars` relative to the current file.
  viewExt: "hbs", // Sets the default extension to `.handlebars`
});

// Declare a route
server.get('/', async (request: FastifyRequest<{
  Querystring: { precision?: number }
}>
, reply) => {
  const precision = request.query.precision || 7
  const hash = ngeohash.encode(42.50903, 1.53605, precision)
  const bounds = GeoTree.bounds(hash)
  
  return reply.view("/templates/index.hbs", { text: "malo", bounds: JSON.stringify(bounds) });
})

// Run the server!
const start = async () => {
  try {
    await server.listen({ port: 3000 })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()