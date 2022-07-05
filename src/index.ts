// Require the framework and instantiate it
import fastify, { FastifyInstance } from 'fastify'
import path from 'path'
import fastifyView from "@fastify/view"
import handlebars from "handlebars"

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
server.get('/', async (request, reply) => {
  console.log("++++++++++++++++++")
  return reply.view("/templates/index.hbs", { text: "malo" });
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