const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const bodyParser = require("body-parser");
const cors = require("cors");
const { default: axios } = require("axios");

async function startServer() {
    const app = express();
    const server = new ApolloServer({
        typeDefs:
            `
            type User {
                id: ID!
                name: String!
                username: String!
                email: String!
                phone: String
                website: String!
                post: [Post]
            }
            type Post{
                userId: ID!
                id: ID!
                title: String!
                body: String!
                user: User
            }
            type Comments{
              postId: ID!
              id: ID!
              name: String!
              email: String!
              body: String!
              post: Post
            }
  
            type Todo {
              id: ID!
              userId: ID!
              title: String!
              completed: Boolean
              user: User 
            }
            type DeleteResponse {
                success: Boolean!
                message: String!
            }
            type Mutation{
                createPost(userId: ID!, title: String!, body: String!): Post
                updatePost(id: ID!, title: String!, body: String!): Post
                updatePostUsingPatch(id: ID!, title: String, body: String): Post
                deletePost(id: ID!): DeleteResponse
            }
  
            type Query {
              getTodos: [Todo] 
              getAllUsers: [User]
              getComments: [Comments]
              getPost: [Post]
              getUser(id: ID!): User
            }
  `
        ,
        resolvers: {
            Todo: {
                user: async (todo) =>
                    (await axios.get(`https://jsonplaceholder.typicode.com/users/${todo.userId}`)).data,
            },
            Comments: {
                post: async (comments) =>
                    (await axios.get(`https://jsonplaceholder.typicode.com/posts/${comments.postId}`)).data,
            },
            User: {
                post: async (user) =>
                    (await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${user.id}`)).data,
            },
            Post: {
                user: async (post) =>
                    (await axios.get(`https://jsonplaceholder.typicode.com/users/${post.userId}`)).data,
            },
            Query: {
                getTodos: async () =>
                    (await axios.get("https://jsonplaceholder.typicode.com/todos")).data,
                getAllUsers: async () =>
                    (await axios.get("https://jsonplaceholder.typicode.com/users")).data,
                getUser: async (parent, { id }) =>
                    (await axios.get(`https://jsonplaceholder.typicode.com/users/${id}`)).data,
                getComments: async () =>
                    (await axios.get("https://jsonplaceholder.typicode.com/comments")).data,
                getPost: async () =>
                    (await axios.get("https://jsonplaceholder.typicode.com/posts")).data,
            },
            Mutation: {
                createPost: async (parent, { userId, title, body }) => {
                    const post = {
                        userId,
                        title,
                        body,
                    };
                    const { data } = await axios.post("https://jsonplaceholder.typicode.com/posts", post);
                    return data;
                },
                updatePost: async (parent, { id, title, body }) => {
                    const post = {
                        title,
                        body,
                    };
                    const { data } = await axios.put(`https://jsonplaceholder.typicode.com/posts/${id}`, post);
                    return data;
                },
                updatePostUsingPatch: async (parent, { id, title, body }) => {
                    const post = {};
                    if (title) post.title = title;
                    if (body) post.body = body;
                    const { data } = await axios.patch(`https://jsonplaceholder.typicode.com/posts/${id}`, post);
                    return data;
                },
                deletePost: async (_, { id }) => {
                    await axios.delete(`https://jsonplaceholder.typicode.com/posts/${id}`);
                    return { success: true, message: `Post with ID ${id} has been deleted` };
                },
            },
        },
    });

    app.use(bodyParser.json());
    app.use(cors());

    await server.start();

    app.use("/graphql", expressMiddleware(server));

    app.listen(8000, () => console.log("Serevr Started at PORT 8000"));
}

startServer();