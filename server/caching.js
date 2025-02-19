// graph-ql server with caching
const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const bodyParser = require("body-parser");
const cors = require("cors");
const { default: axios } = require("axios");
const redis = require("redis");

async function startServer() {
    const app = express();
    const client = redis.createClient();
    await client.connect(); // Redis v4 uses async connection

    client.on("error", (err) => console.error("Redis Error:", err));

    const server = new ApolloServer({
        typeDefs: `
            type User {
                id: ID!
                name: String!
                username: String!
                email: String!
                phone: String
                website: String!
            }
            type Todo {
                id: ID!
                userId: ID!
                title: String!
                completed: Boolean
                user: User
            }
            type Query {
                getTodos: [Todo]
                getUser(id: ID!): User
            }
        `,
        resolvers: {
            Query: {
                getTodos: async () => {
                    const cacheKey = "todos";
                    const cachedTodos = await client.get(cacheKey);
                    if (cachedTodos) {
                        console.log("Serving from cache");
                        return JSON.parse(cachedTodos);
                    }

                    const todos = (await axios.get("https://jsonplaceholder.typicode.com/todos")).data;
                    const users = (await axios.get("https://jsonplaceholder.typicode.com/users")).data;

                    const userMap = users.reduce((acc, user) => {
                        acc[user.id] = user;
                        return acc;
                    }, {});

                    const updatedTodos = todos.map(todo => ({
                        ...todo,
                        user: userMap[todo.userId] || null
                    }));

                    await client.setEx(cacheKey, 600, JSON.stringify(updatedTodos));

                    console.log("Serving fresh data");
                    return updatedTodos;
                },
                getUser: async (_, { id }) => {
                    const cacheKey = `user:${id}`;
                    const cachedUser = await client.get(cacheKey);
                    if (cachedUser) {
                        console.log(`Serving User ${id} from cache`);
                        return JSON.parse(cachedUser);
                    }

                    const user = (await axios.get(`https://jsonplaceholder.typicode.com/users/${id}`)).data;
                    await client.setEx(cacheKey, 600, JSON.stringify(user));

                    console.log(`Serving fresh User ${id}`);
                    return user;
                }
            }
        }
    });

    app.use(bodyParser.json());
    app.use(cors());

    await server.start();
    app.use("/graphql", expressMiddleware(server));

    app.listen(8000, () => console.log("Server running on port 8000"));
}

startServer();
