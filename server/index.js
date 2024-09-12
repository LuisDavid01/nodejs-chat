import express from 'express'
import logger from 'morgan'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

import { Server } from 'socket.io'

import { createServer } from 'node:http'
dotenv.config()
const port = process.env.PORT ?? 3000
const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {
        
    }
})
const db = createClient(
    {
        url: "libsql://informed-nebula-luisdavid01.turso.io",
        authToken: process.env.DB_TOKEN

    }
)

await db.execute(`CREATE TABLE IF NOT EXISTS messages (
                    id integer PRIMARY KEY AUTOINCREMENT,
                    content text
                )`)

io.on('connection', ( socket ) => {
    console.log('a user has connected')
    socket.on('disconnect', () => {
        console.log('a user has disconnected')
    })

    socket.on('chat message', async (msg) => {
        let result
        try{
            result = await db.execute({
                sql: `INSERT INTO messages(content) VALUES (:content)`,
                args: { content: msg }
            })
        }catch(e){
            throw new Error('no se pudo guardar el mensaje en la db')
        }
        io.emit('chat message', msg)
    })
})
app.use(logger('dev'))
app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/cliente/index.html')
})

server.listen(port, () =>{
    console.log('server running on port: ', port)
})