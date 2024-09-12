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
                    content text,
                    user text
                );`)

io.on('connection', async ( socket ) => {
    console.log('a user has connected')
    socket.on('disconnect', () => {
        console.log('a user has disconnected')
    })

    socket.on('chat message', async (msg) => {
        let result
        const username = socket.handshake.auth.username ?? 'anonymus'
        console.log(username)
        try{
            result = await db.execute({
                sql: 'INSERT INTO messages (content, user)  VALUES (:message, :username)',
                args: { message: msg, username }
            })
        }catch(e){
            throw new Error('no se pudo guardar el mensaje en la db')
            return
        }
        io.emit('chat message', msg, result.lastInsertRowid.toString(), username)
        
        
    })
    
    if(!socket.recovered){
        try{
            const results = await db.execute({
                sql: 'SELECT id, content, user from messages WHERE id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            })
            results.rows.forEach(row => {
                socket.emit('chat message', row.content, row.id.toString(), row.user)
            })
        }catch(e){
            console.log('an error has occurred ', e.message)
        }
        
    }
})
app.use(logger('dev'))
app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/cliente/index.html')
})

server.listen(port, () =>{
    console.log('server running on port: ', port)
})